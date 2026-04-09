import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

const TERMINAL_DISPUTE_STATUSES = ['resolved', 'dismissed', 'withdrawn', 'mediated'];

export type SettlementBlockers = {
  blocked: boolean;
  unresolved_disputes: number;
  pending_submissions: number;
  integrity_flag_count: number;
  integrity_flags: Json[];
  reasons: string[];
};

export type RewardSettlementResult = {
  ok: boolean;
  code: string;
  status: 'pending' | 'committed' | 'held' | 'killed' | string;
  message?: string | null;
  idempotency_key?: string | null;
  distributed_count?: number;
  distributed_tokens?: number;
  emission_cap?: number;
  carryover_out?: number;
  carryover_streak?: number;
};

export function parseSettlementBlockers(data: unknown): SettlementBlockers {
  const raw = (data ?? {}) as Record<string, unknown>;
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons.map((value) => String(value))
    : [];
  const integrityFlags = Array.isArray(raw.integrity_flags)
    ? (raw.integrity_flags as Json[])
    : [];

  return {
    blocked: Boolean(raw.blocked),
    unresolved_disputes: Number(raw.unresolved_disputes ?? 0),
    pending_submissions: Number(raw.pending_submissions ?? 0),
    integrity_flag_count: Number(raw.integrity_flag_count ?? integrityFlags.length),
    integrity_flags: integrityFlags,
    reasons,
  };
}

export function parseRewardSettlementResult(data: unknown): RewardSettlementResult {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(raw.ok),
    code: String(raw.code ?? ''),
    status: String(raw.status ?? 'pending'),
    message: raw.message ? String(raw.message) : null,
    idempotency_key: raw.idempotency_key ? String(raw.idempotency_key) : null,
    distributed_count: Number(raw.distributed_count ?? 0),
    distributed_tokens: Number(raw.distributed_tokens ?? 0),
    emission_cap: Number(raw.emission_cap ?? 0),
    carryover_out: Number(raw.carryover_out ?? 0),
    carryover_streak: Number(raw.carryover_streak ?? 0),
  };
}

/**
 * Check if a sprint has any blockers preventing settlement completion.
 * Uses the `get_sprint_settlement_blockers` RPC with a JS fallback.
 */
export async function resolveSettlementBlockers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sprintId: string
): Promise<SettlementBlockers> {
  const { data, error } = await supabase.rpc('get_sprint_settlement_blockers', {
    p_sprint_id: sprintId,
  });

  if (!error && data) {
    return parseSettlementBlockers(data);
  }

  // Fallback if RPC is not available yet in a partially migrated environment.
  const { data: sprintTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('sprint_id', sprintId);
  const sprintTaskIds = (sprintTasks ?? []).map((t: { id: string }) => t.id);

  const [{ count: unresolvedCount }, { count: pendingCount }, { data: sprint }] = await Promise.all([
    supabase
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .eq('sprint_id', sprintId)
      .not('status', 'in', `("${TERMINAL_DISPUTE_STATUSES.join('","')}")`),
    sprintTaskIds.length > 0
      ? supabase
          .from('task_submissions')
          .select('id', { count: 'exact', head: true })
          .in('task_id', sprintTaskIds)
          .eq('review_status', 'pending')
      : Promise.resolve({ count: 0 } as { count: number }),
    supabase
      .from('sprints')
      .select('settlement_integrity_flags')
      .eq('id', sprintId)
      .maybeSingle(),
  ]);

  const integrityFlags = Array.isArray(sprint?.settlement_integrity_flags)
    ? (sprint.settlement_integrity_flags as Json[])
    : [];
  const unresolvedDisputes = unresolvedCount ?? 0;
  const pendingSubmissions = pendingCount ?? 0;
  const reasons: string[] = [];

  if (unresolvedDisputes > 0) {
    reasons.push(`${unresolvedDisputes} unresolved dispute(s)`);
  }
  if (pendingSubmissions > 0) {
    reasons.push(`${pendingSubmissions} submission(s) still pending review`);
  }
  if (integrityFlags.length > 0) {
    reasons.push('unresolved integrity flags are present');
  }

  return {
    blocked: reasons.length > 0,
    unresolved_disputes: unresolvedDisputes,
    pending_submissions: pendingSubmissions,
    integrity_flag_count: integrityFlags.length,
    integrity_flags: integrityFlags,
    reasons,
  };
}
