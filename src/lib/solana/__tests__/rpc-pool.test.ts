import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { classifyRpcError, CircuitBreaker, type RpcErrorKind } from '../rpc-pool';

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
