/**
 * Pure functions for proposal governance anti-abuse checks.
 * Extracted from the route handler so they can be unit-tested without Supabase.
 */

export type AntiAbuseConfig = {
  proposal_threshold_org: number;
  max_live_proposals: number;
  proposer_cooldown_days: number;
};

export type ThresholdCheckInput = {
  threshold: number;
  walletPubkey: string | null;
  balance: number | null;
};

export type ThresholdResult =
  | { ok: true }
  | { ok: false; reason: 'no_wallet'; required: number }
  | { ok: false; reason: 'insufficient_balance'; required: number; current: number };

/** Check if a user meets the token threshold to create proposals. */
export function checkTokenThreshold(input: ThresholdCheckInput): ThresholdResult {
  if (input.threshold <= 0) return { ok: true };
  if (!input.walletPubkey) return { ok: false, reason: 'no_wallet', required: input.threshold };
  const balance = input.balance ?? 0;
  if (balance < input.threshold) {
    return { ok: false, reason: 'insufficient_balance', required: input.threshold, current: balance };
  }
  return { ok: true };
}

export type MaxLiveResult =
  | { ok: true }
  | { ok: false; activeCount: number; maxAllowed: number };

/** Check if a user has not exceeded the max live proposals limit. */
export function checkMaxLiveProposals(activeCount: number, maxLive: number): MaxLiveResult {
  if (activeCount >= maxLive) {
    return { ok: false, activeCount, maxAllowed: maxLive };
  }
  return { ok: true };
}

export type CooldownResult =
  | { ok: true }
  | { ok: false; retryAfter: Date; remainingDays: number; cooldownDays: number };

/** Check if enough time has passed since the user's last non-draft proposal. */
export function checkCooldownPeriod(
  lastProposalCreatedAt: Date | null,
  cooldownDays: number,
  now: Date = new Date()
): CooldownResult {
  if (cooldownDays <= 0) return { ok: true };
  if (!lastProposalCreatedAt) return { ok: true };

  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const cooldownEnds = lastProposalCreatedAt.getTime() + cooldownMs;
  const nowMs = now.getTime();

  if (cooldownEnds > nowMs) {
    const remainingMs = cooldownEnds - nowMs;
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return {
      ok: false,
      retryAfter: new Date(cooldownEnds),
      remainingDays,
      cooldownDays,
    };
  }

  return { ok: true };
}

/** Returns true if the user's role bypasses governance checks. */
export function isPrivilegedRole(role: string | null): boolean {
  return role === 'admin' || role === 'council';
}
