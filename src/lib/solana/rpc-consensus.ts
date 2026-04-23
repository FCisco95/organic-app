/**
 * ConsensusVerifier — 2-of-N agreement check across RpcProviders.
 *
 * Purpose: for security-critical reads (Organic ID grants, vote snapshots,
 * donation verification), parallelize the read across all providers and
 * require identical results before trusting the answer. Designed to
 * detect a single malicious or compromised RPC endpoint.
 *
 * Default-off via `SOLANA_RPC_CONSENSUS_ENABLED`. When disabled, delegates
 * to `RpcPool.call` so the transport semantics are unchanged.
 *
 * Spec: docs/superpowers/specs/2026-04-22-rpc-resilience-design.md §7, §10.
 */

import type { Connection } from '@solana/web3.js';
import type { RpcProvider } from './providers';
import type { RpcPool } from './rpc-pool';
import type { TokenHolder } from './rpc';
import { withTimeout } from './rpc-timing';
import { logger } from '@/lib/logger';

const DEFAULT_MIN_PROVIDERS = 2;
const DEFAULT_TIMEOUT_MS = 10_000;

export interface ProviderResult {
  provider: string;
  ok: boolean;
  value?: unknown;
  error?: unknown;
}

export class ConsensusError extends Error {
  constructor(
    message: string,
    readonly label: string,
    readonly results: ReadonlyArray<ProviderResult>
  ) {
    super(message);
    this.name = 'ConsensusError';
  }
}

export interface ConsensusVerifyOptions<T> {
  label: string;
  compare?: (a: T, b: T) => boolean;
  minProviders?: number;
  timeoutMs?: number;
}

export interface AuditLogRow {
  event: 'rpc.consensus_disagreement';
  label: string;
  payload: {
    providers: Array<{ name: string; ok: boolean; value?: unknown; error?: string }>;
    capturedAt: string;
  };
}

export interface AuditLogWriter {
  write(row: AuditLogRow): Promise<void>;
}

/**
 * Default audit writer: routes to the project logger under a dedicated
 * event key (`rpc.consensus_disagreement`) so aggregators can alert on it.
 * A DB-persisted writer is deferred to a follow-up PR (see task description
 * — no `audit_log` table exists in this project today).
 */
export const defaultAuditLogWriter: AuditLogWriter = {
  async write(row: AuditLogRow): Promise<void> {
    logger.error('rpc.consensus_disagreement', row);
  },
};

/** Default comparator used when caller does not provide one. */
function defaultCompare<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// --- Public comparator helpers ------------------------------------------

export function compareBoolean(a: boolean, b: boolean): boolean {
  return a === b;
}

function toBigInt(value: bigint | number): bigint {
  if (typeof value === 'bigint') return value;
  return BigInt(Math.trunc(Number(value)));
}

export function compareLamports(a: bigint | number, b: bigint | number): boolean {
  return toBigInt(a) === toBigInt(b);
}

function normalizeHolders(holders: ReadonlyArray<TokenHolder>): Array<[string, number]> {
  const summed = new Map<string, number>();
  for (const h of holders) {
    summed.set(h.address, (summed.get(h.address) ?? 0) + h.balance);
  }
  return Array.from(summed.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

export function compareHolderSet(
  a: ReadonlyArray<TokenHolder>,
  b: ReadonlyArray<TokenHolder>
): boolean {
  const na = normalizeHolders(a);
  const nb = normalizeHolders(b);
  if (na.length !== nb.length) return false;
  for (let i = 0; i < na.length; i++) {
    if (na[i][0] !== nb[i][0]) return false;
    if (na[i][1] !== nb[i][1]) return false;
  }
  return true;
}

const ALLOWED_TX_STATUSES = new Set(['confirmed', 'finalized']);

export function compareTxConfirmation(
  a: { slot: number; status: string } | null,
  b: { slot: number; status: string } | null
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.slot !== b.slot) return false;
  return ALLOWED_TX_STATUSES.has(a.status) && ALLOWED_TX_STATUSES.has(b.status);
}

// --- ConsensusVerifier --------------------------------------------------

interface ConsensusDeps {
  auditLog: AuditLogWriter;
  now?: () => number;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'unknown error';
  }
}

export class ConsensusVerifier {
  private readonly deps: ConsensusDeps;

  constructor(
    private readonly providers: ReadonlyArray<RpcProvider>,
    private readonly pool: RpcPool,
    deps: ConsensusDeps = { auditLog: defaultAuditLogWriter }
  ) {
    this.deps = deps;
  }

  async verify<T>(
    operation: (connection: Connection) => Promise<T>,
    opts: ConsensusVerifyOptions<T>
  ): Promise<T> {
    const label = opts.label;
    const minProviders = opts.minProviders ?? DEFAULT_MIN_PROVIDERS;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const enabled = process.env.SOLANA_RPC_CONSENSUS_ENABLED === 'true';

    if (!enabled) {
      return this.pool.call(operation, { label, timeoutMs });
    }

    if (this.providers.length < minProviders) {
      logger.warn('rpc.consensus_skipped_single_provider', {
        label,
        providers: this.providers.length,
        minProviders,
      });
      return this.pool.call(operation, { label, timeoutMs });
    }

    const compare = opts.compare ?? defaultCompare<T>;

    const settled = await Promise.allSettled(
      this.providers.map((provider) =>
        withTimeout(operation(provider.connection), timeoutMs, label)
      )
    );

    const results: ProviderResult[] = settled.map((outcome, i) => {
      const provider = this.providers[i];
      if (outcome.status === 'fulfilled') {
        return { provider: provider.name, ok: true, value: outcome.value };
      }
      return { provider: provider.name, ok: false, error: outcome.reason };
    });

    const successes = results.filter((r) => r.ok);

    if (successes.length < minProviders) {
      throw new ConsensusError('insufficient providers responded', label, results);
    }

    // Pairwise compare — any disagreement fails the check.
    for (let i = 0; i < successes.length; i++) {
      for (let j = i + 1; j < successes.length; j++) {
        const a = successes[i].value as T;
        const b = successes[j].value as T;
        if (!compare(a, b)) {
          await this.writeDisagreementAudit(label, results);
          throw new ConsensusError('consensus disagreement', label, results);
        }
      }
    }

    return successes[0].value as T;
  }

  private async writeDisagreementAudit(
    label: string,
    results: ReadonlyArray<ProviderResult>
  ): Promise<void> {
    const capturedAt = new Date(this.deps.now?.() ?? Date.now()).toISOString();
    const row: AuditLogRow = {
      event: 'rpc.consensus_disagreement',
      label,
      payload: {
        providers: results.map((r) => {
          const entry: { name: string; ok: boolean; value?: unknown; error?: string } = {
            name: r.provider,
            ok: r.ok,
          };
          if (r.ok) entry.value = r.value;
          else entry.error = errorMessage(r.error);
          return entry;
        }),
        capturedAt,
      },
    };
    try {
      await this.deps.auditLog.write(row);
    } catch (err) {
      logger.error('rpc.consensus_audit_write_failed', { label, error: err });
    }
  }
}
