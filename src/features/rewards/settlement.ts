export const DEFAULT_SETTLEMENT_EMISSION_PERCENT = 0.01;
export const DEFAULT_SETTLEMENT_FIXED_CAP = 10_000;
export const MAX_SETTLEMENT_CARRYOVER_SPRINTS = 3;

export interface RewardSettlementPolicy {
  emissionPercent: number;
  fixedCapPerSprint: number;
  carryoverSprintCap: number;
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeRewardSettlementPolicy(config: unknown): RewardSettlementPolicy {
  const source = config && typeof config === 'object' ? (config as Record<string, unknown>) : {};

  const rawPercent = parseNumeric(source.settlement_emission_percent);
  const rawFixedCap = parseNumeric(source.settlement_fixed_cap_per_sprint);
  const rawCarryover = parseNumeric(source.settlement_carryover_sprint_cap);

  const emissionPercent =
    rawPercent && rawPercent > 0 && rawPercent <= 1
      ? rawPercent
      : DEFAULT_SETTLEMENT_EMISSION_PERCENT;
  const fixedCapPerSprint =
    rawFixedCap != null && rawFixedCap >= 0
      ? rawFixedCap
      : DEFAULT_SETTLEMENT_FIXED_CAP;
  const carryoverSprintCap = Math.max(
    1,
    Math.min(
      MAX_SETTLEMENT_CARRYOVER_SPRINTS,
      rawCarryover != null ? Math.trunc(rawCarryover) : MAX_SETTLEMENT_CARRYOVER_SPRINTS
    )
  );

  return {
    emissionPercent,
    fixedCapPerSprint,
    carryoverSprintCap,
  };
}

export function computeEmissionCap(
  treasuryBalance: number,
  policy: RewardSettlementPolicy
): number {
  const safeTreasury = Number.isFinite(treasuryBalance) ? Math.max(0, treasuryBalance) : 0;
  const percentageCap = safeTreasury * policy.emissionPercent;
  return Number(Math.max(0, Math.min(percentageCap, policy.fixedCapPerSprint)).toFixed(9));
}

export function computeCarryoverIn(params: {
  previousCarryoverAmount: number;
  previousCarryoverStreak: number;
  carryoverSprintCap: number;
}): number {
  const amount = Number.isFinite(params.previousCarryoverAmount)
    ? Math.max(0, params.previousCarryoverAmount)
    : 0;
  const streak = Number.isFinite(params.previousCarryoverStreak)
    ? Math.max(0, Math.trunc(params.previousCarryoverStreak))
    : 0;

  if (streak >= params.carryoverSprintCap) {
    return 0;
  }

  return Number(amount.toFixed(9));
}

export function computeCarryoverOut(params: {
  emissionCap: number;
  distributedTokens: number;
  previousCarryoverStreak: number;
  carryoverSprintCap: number;
}): { carryoverOut: number; carryoverStreak: number } {
  const emissionCap = Number.isFinite(params.emissionCap) ? Math.max(0, params.emissionCap) : 0;
  const distributedTokens = Number.isFinite(params.distributedTokens)
    ? Math.max(0, params.distributedTokens)
    : 0;

  const carryoverOut = Number(Math.max(0, emissionCap - distributedTokens).toFixed(9));
  if (carryoverOut <= 0) {
    return { carryoverOut: 0, carryoverStreak: 0 };
  }

  const nextStreak = Math.max(
    1,
    Math.min(
      params.carryoverSprintCap,
      Math.max(0, Math.trunc(params.previousCarryoverStreak)) + 1
    )
  );

  return {
    carryoverOut,
    carryoverStreak: nextStreak,
  };
}

export function classifySettlementIntegrity(params: {
  requestedPool: number;
  emissionCap: number;
}): { blocked: boolean; reason: string | null } {
  const requestedPool = Number.isFinite(params.requestedPool) ? params.requestedPool : 0;
  const emissionCap = Number.isFinite(params.emissionCap) ? Math.max(0, params.emissionCap) : 0;

  if (requestedPool < 0) {
    return {
      blocked: true,
      reason: 'negative reward pool is not allowed',
    };
  }

  if (requestedPool > emissionCap + 1e-9) {
    return {
      blocked: true,
      reason: 'reward pool exceeds emission cap',
    };
  }

  return {
    blocked: false,
    reason: null,
  };
}
