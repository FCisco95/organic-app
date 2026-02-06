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

export interface TreasuryData {
  balances: TreasuryBalance;
  allocations: TreasuryAllocation[];
  transactions: TreasuryTransaction[];
  wallet_address: string;
}
