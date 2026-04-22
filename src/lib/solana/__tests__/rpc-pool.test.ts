import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  classifyRpcError,
  CircuitBreaker,
  ProviderHealthTracker,
  RpcPool,
  type RpcErrorKind,
  type RpcProviderLike,
} from '../rpc-pool';

function check(error: unknown, expected: RpcErrorKind): void {
  expect(classifyRpcError(error)).toBe(expected);
}

describe('classifyRpcError', () => {
  it('treats network timeouts as transient', () => {
    check(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }), 'transient');
    check(new Error('Request timed out'), 'transient');
  });

  it('treats ECONN* as transient', () => {
    check(Object.assign(new Error('econnreset'), { code: 'ECONNRESET' }), 'transient');
    check(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }), 'transient');
  });

  it('treats HTTP 429 and 5xx as transient', () => {
    check({ status: 429, message: 'rate limited' }, 'transient');
    check({ status: 503, message: 'service unavailable' }, 'transient');
    check({ response: { status: 502 }, message: 'bad gateway' }, 'transient');
  });

  it('treats JSON-RPC -32005 and -32603 as transient', () => {
    check({ code: -32005, message: 'rate limit exceeded' }, 'transient');
    check({ code: -32603, message: 'internal error' }, 'transient');
  });

  it('treats HTTP 4xx (excluding 429) as permanent', () => {
    check({ status: 400, message: 'bad request' }, 'permanent');
    check({ status: 401, message: 'unauthorized' }, 'permanent');
    check({ status: 404, message: 'not found' }, 'permanent');
  });

  it('treats JSON-RPC -32602 invalid params as permanent', () => {
    check({ code: -32602, message: 'invalid params' }, 'permanent');
  });

  it('treats "could not find account" as empty-ok', () => {
    check(new Error('could not find account'), 'empty-ok');
    check(new Error('Account does not exist'), 'empty-ok');
  });

  it('treats POJO errors with empty-ok message text as empty-ok', () => {
    check({ message: 'could not find account', status: 404 }, 'empty-ok');
    check({ message: 'Account does not exist' }, 'empty-ok');
  });

  it('treats unknown errors as transient (fail-open for retry)', () => {
    check(new Error('something weird'), 'transient');
    check('string error', 'transient');
    check(null, 'transient');
  });
});

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function recordFailures(breaker: CircuitBreaker, count: number): void {
    for (let i = 0; i < count; i++) breaker.recordFailure();
  }

  function recordSuccesses(breaker: CircuitBreaker, count: number): void {
    for (let i = 0; i < count; i++) breaker.recordSuccess();
  }

  it('stays closed below minimum-sample threshold (<20 calls)', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 19);
    expect(breaker.state()).toBe('closed');
    expect(breaker.canAttempt()).toBe(true);
  });

  it('stays closed when failure rate is <=50% even above threshold', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 10);
    recordSuccesses(breaker, 10);
    expect(breaker.state()).toBe('closed');
  });

  it('opens when >50% of last 20+ calls fail', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 11);
    recordSuccesses(breaker, 9);
    expect(breaker.state()).toBe('open');
    expect(breaker.canAttempt()).toBe(false);
  });

  it('drops samples older than 60s from the rolling window', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 11);
    recordSuccesses(breaker, 9);
    expect(breaker.state()).toBe('open');

    vi.advanceTimersByTime(61_000);
    // Window drained (samples aged out), but openedAt persists — 61s ≥ 30s
    // half-open threshold, so breaker awaits a probe. Single-probe gating
    // prevents a stampede against a still-possibly-bad provider.
    expect(breaker.state()).toBe('half-open');
    expect(breaker.canAttempt()).toBe(true);  // probe admitted
    expect(breaker.canAttempt()).toBe(false); // subsequent callers blocked
  });

  it('transitions open -> half-open after 30s and allows a single probe', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 20);
    expect(breaker.state()).toBe('open');
    expect(breaker.canAttempt()).toBe(false);

    vi.advanceTimersByTime(30_001);
    expect(breaker.state()).toBe('half-open');
    expect(breaker.canAttempt()).toBe(true); // probe allowed

    // Second immediate probe attempt denied — only one in-flight probe.
    expect(breaker.canAttempt()).toBe(false);
  });

  it('half-open probe success closes the breaker', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 20);
    vi.advanceTimersByTime(30_001);
    breaker.canAttempt();
    breaker.recordSuccess();
    expect(breaker.state()).toBe('closed');
    expect(breaker.canAttempt()).toBe(true);
  });

  it('half-open probe failure reopens the breaker for another 30s', () => {
    const breaker = new CircuitBreaker();
    recordFailures(breaker, 20);
    vi.advanceTimersByTime(30_001);
    breaker.canAttempt();
    breaker.recordFailure();

    expect(breaker.state()).toBe('open');
    expect(breaker.canAttempt()).toBe(false);

    vi.advanceTimersByTime(30_001);
    expect(breaker.state()).toBe('half-open');
  });
});

describe('ProviderHealthTracker', () => {
  it('retains the last 100 latency samples', () => {
    const t = new ProviderHealthTracker();
    for (let i = 0; i < 150; i++) t.recordOutcome({ ok: true, latencyMs: i });
    const snapshot = t.snapshot();
    expect(snapshot.latencySamples).toHaveLength(100);
    expect(snapshot.latencySamples[0]).toBe(50);
    expect(snapshot.latencySamples[99]).toBe(149);
  });

  it('counts failures and stores last error message', () => {
    const t = new ProviderHealthTracker();
    t.recordOutcome({ ok: true, latencyMs: 5 });
    t.recordOutcome({ ok: false, latencyMs: 12, errorMessage: 'boom' });
    const snapshot = t.snapshot();
    expect(snapshot.failureCount).toBe(1);
    expect(snapshot.successCount).toBe(1);
    expect(snapshot.lastErrorMessage).toBe('boom');
  });

  it('snapshot is a copy — mutations do not affect tracker state', () => {
    const t = new ProviderHealthTracker();
    t.recordOutcome({ ok: true, latencyMs: 7 });
    const snapshot = t.snapshot();
    snapshot.latencySamples.push(9999);
    expect(t.snapshot().latencySamples).toHaveLength(1);
  });
});

function stubProvider(
  name: string,
  tier: 'primary' | 'secondary' | 'fallback',
  handler: () => Promise<unknown>,
  timeoutMs = 50
): RpcProviderLike {
  // Connection is only passed through to handler; tests do not touch it.
  return {
    name,
    tier,
    timeoutMs,
    connection: {} as never,
    __invoke: handler,
  } as unknown as RpcProviderLike;
}

describe('RpcPool.call — single provider', () => {
  beforeEach(() => vi.useRealTimers());

  it('returns the operation result on success', async () => {
    const provider = stubProvider('p', 'primary', async () => 42);
    const pool = new RpcPool([provider]);
    const result = await pool.call(async (_c) => {
      return (provider as unknown as { __invoke: () => Promise<number> }).__invoke();
    });
    expect(result).toBe(42);
  });

  it('enforces per-provider timeoutMs', async () => {
    const provider = stubProvider(
      'p',
      'primary',
      () => new Promise((r) => setTimeout(() => r('late'), 500)),
      50
    );
    const pool = new RpcPool([provider]);
    await expect(
      pool.call(async (_c) =>
        (provider as unknown as { __invoke: () => Promise<string> }).__invoke()
      )
    ).rejects.toThrow(/timeout|exhausted/i);
  });

  it('honors opts.timeoutMs override', async () => {
    const provider = stubProvider(
      'p',
      'primary',
      () => new Promise((r) => setTimeout(() => r('late'), 200)),
      5_000
    );
    const pool = new RpcPool([provider]);
    await expect(
      pool.call(
        async (_c) =>
          (provider as unknown as { __invoke: () => Promise<string> }).__invoke(),
        { timeoutMs: 25 }
      )
    ).rejects.toThrow(/timeout|exhausted/i);
  });

  it('caps total call time at timeoutMs * 3', async () => {
    // Single provider, transient errors each attempt → budget cap after ~3×timeoutMs.
    const provider = stubProvider(
      'p',
      'primary',
      () => new Promise((r) => setTimeout(() => r('late'), 200)),
      60
    );
    const pool = new RpcPool([provider]);
    const started = Date.now();
    await expect(
      pool.call(async (_c) =>
        (provider as unknown as { __invoke: () => Promise<string> }).__invoke()
      )
    ).rejects.toBeInstanceOf(Error);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(400); // 3 × 60 + overhead
  });
});

describe('RpcPool.call — error branches', () => {
  beforeEach(() => vi.useRealTimers());

  function makeProvider(name: string): RpcProviderLike {
    return {
      name,
      tier: 'primary',
      timeoutMs: 100,
      connection: {} as never,
    } as RpcProviderLike;
  }

  it('retries the same provider once on transient error, then succeeds', async () => {
    const provider = makeProvider('p1');
    const pool = new RpcPool([provider]);
    let calls = 0;
    const result = await pool.call(async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('boom'), { status: 503 });
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does not retry on permanent error (4xx)', async () => {
    const provider = makeProvider('p1');
    const pool = new RpcPool([provider]);
    let calls = 0;
    await expect(
      pool.call(async () => {
        calls += 1;
        throw Object.assign(new Error('bad'), { status: 400 });
      })
    ).rejects.toThrow('bad');
    expect(calls).toBe(1);
  });

  it('propagates empty-ok error as a real answer without retrying', async () => {
    const provider = makeProvider('p1');
    const pool = new RpcPool([provider]);
    let calls = 0;
    await expect(
      pool.call(async () => {
        calls += 1;
        throw new Error('could not find account');
      })
    ).rejects.toThrow(/could not find account/);
    expect(calls).toBe(1);
  });

  it('records success on empty-ok in health stats (not a provider fault)', async () => {
    const provider = makeProvider('p1');
    const pool = new RpcPool([provider]);
    await expect(
      pool.call(async () => {
        throw new Error('account does not exist');
      })
    ).rejects.toThrow();
    const [health] = pool.getHealth();
    expect(health.stats.successCount).toBe(1);
    expect(health.stats.failureCount).toBe(0);
  });
});

describe('RpcPool.call — failover order', () => {
  beforeEach(() => vi.useRealTimers());

  // Tag each provider's connection with an _id so handlers can tell
  // which provider invoked them without reaching into pool internals.
  function idProvider(
    name: 'primary' | 'secondary' | 'fallback',
    timeoutMs = 100
  ): RpcProviderLike {
    return {
      name,
      tier: name,
      timeoutMs,
      connection: { _id: name } as never,
    } as RpcProviderLike;
  }

  function idOf(c: unknown): string {
    return (c as { _id: string })._id;
  }

  it('fails over primary → secondary when primary keeps throwing transient', async () => {
    const pool = new RpcPool([idProvider('primary'), idProvider('secondary')]);
    const touched: string[] = [];
    const result = await pool.call(async (c) => {
      touched.push(idOf(c));
      if (idOf(c) === 'primary') {
        throw Object.assign(new Error('rate limit'), { status: 429 });
      }
      return 'ok-from-secondary';
    });
    expect(result).toBe('ok-from-secondary');
    // primary: 2 attempts (initial + 1 retry) → secondary: 1 success.
    expect(touched).toEqual(['primary', 'primary', 'secondary']);
  });

  it('skips a provider whose breaker is open', async () => {
    const pool = new RpcPool([idProvider('primary'), idProvider('secondary')]);

    // Prime: 20 rounds where only primary fails; secondary stays healthy.
    for (let i = 0; i < 20; i++) {
      await pool.call(async (c) => {
        if (idOf(c) === 'primary') {
          throw Object.assign(new Error('rl'), { status: 503 });
        }
        return 'ok';
      });
    }
    const health = pool.getHealth();
    expect(health[0].breaker).toBe('open');
    expect(health[1].breaker).toBe('closed');

    const touched: string[] = [];
    const result = await pool.call(async (c) => {
      touched.push(idOf(c));
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(touched).toEqual(['secondary']); // primary skipped entirely
  });

  it('enforces 6-attempt total budget across 3 providers (2 retries each)', async () => {
    const pool = new RpcPool([
      idProvider('primary', 50),
      idProvider('secondary', 50),
      idProvider('fallback', 50),
    ]);
    const touched: string[] = [];
    await expect(
      pool.call(async (c) => {
        touched.push(idOf(c));
        throw Object.assign(new Error('rl'), { status: 503 });
      })
    ).rejects.toBeInstanceOf(Error);
    expect(touched).toEqual([
      'primary',
      'primary',
      'secondary',
      'secondary',
      'fallback',
      'fallback',
    ]);
  });

  it('throws RpcCallError with lastKind when all providers exhaust', async () => {
    const { RpcCallError } = await import('../rpc-pool');
    const pool = new RpcPool([idProvider('primary'), idProvider('secondary')]);
    const err = await pool
      .call(async () => {
        throw Object.assign(new Error('rl'), { status: 503 });
      })
      .then(
        () => null,
        (e: unknown) => e
      );
    expect(err).toBeInstanceOf(RpcCallError);
    expect((err as InstanceType<typeof RpcCallError>).lastKind).toBe('transient');
  });
});
