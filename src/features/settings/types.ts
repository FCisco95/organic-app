export interface TreasuryAllocationConfig {
  key: string;
  percentage: number;
  color: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  // Token config
  token_symbol: string;
  token_mint: string | null;
  token_decimals: number;
  token_total_supply: number;
  // Treasury config
  treasury_wallet: string | null;
  treasury_allocations: TreasuryAllocationConfig[];
  // Sprint defaults
  default_sprint_capacity: number;
  default_sprint_duration_days: number;
  // Organic ID config
  organic_id_threshold: number | null;
  // Timestamps
  created_at: string | null;
  updated_at: string | null;
}

export interface VotingConfig {
  id: string;
  org_id: string | null;
  quorum_percentage: number;
  approval_threshold: number;
  voting_duration_days: number;
  proposal_threshold_org: number;
  proposer_cooldown_days: number;
  max_live_proposals: number;
  abstain_counts_toward_quorum: boolean;
}

export interface OrganizationWithVoting extends Organization {
  voting_config: VotingConfig | null;
}

export type SettingsTab =
  | 'general'
  | 'token'
  | 'treasury'
  | 'governance'
  | 'sprints'
  | 'members';

export const SETTINGS_TABS: { key: SettingsTab; labelKey: string; icon: string }[] = [
  { key: 'general', labelKey: 'Settings.tabs.general', icon: 'Settings' },
  { key: 'token', labelKey: 'Settings.tabs.token', icon: 'Coins' },
  { key: 'treasury', labelKey: 'Settings.tabs.treasury', icon: 'Wallet' },
  { key: 'governance', labelKey: 'Settings.tabs.governance', icon: 'Vote' },
  { key: 'sprints', labelKey: 'Settings.tabs.sprints', icon: 'Zap' },
  { key: 'members', labelKey: 'Settings.tabs.members', icon: 'Users' },
];
