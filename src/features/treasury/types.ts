export interface TreasuryBalance {
  sol: number;
  sol_usd: number | null;
  org: number;
  org_usd: number | null;
  total_usd: number | null;
}

export interface TreasuryAllocation {
  key: string;
  label: string;
  percentage: number;
  color: string;
  amount_usd: number | null;
}

export interface TreasuryTransaction {
  signature: string;
  block_time: number | null;
  slot: number;
  type: 'transfer' | 'token_transfer' | 'unknown';
  amount: number | null;
  token: 'SOL' | 'ORG' | null;
  direction: 'in' | 'out';
}

export interface TreasuryEmissionPolicy {
  settlement_emission_percent: number;
  settlement_fixed_cap_per_sprint: number;
  settlement_carryover_sprint_cap: number;
}

export interface TreasuryLatestSettlement {
  sprint_id: string | null;
  status: 'pending' | 'committed' | 'held' | 'killed' | null;
  committed_at: string | null;
  kill_switch_at: string | null;
  blocked_reason: string | null;
  emission_cap: number | null;
  carryover_amount: number | null;
}

export interface TreasuryTrustMeta {
  emission_policy: TreasuryEmissionPolicy;
  latest_settlement: TreasuryLatestSettlement;
  audit_log_link: string;
  updated_at: string;
  refresh_interval_seconds: number;
}

export interface TreasuryData {
  balances: TreasuryBalance;
  allocations: TreasuryAllocation[];
  transactions: TreasuryTransaction[];
  wallet_address: string;
  trust: TreasuryTrustMeta;
}
