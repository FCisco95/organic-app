export interface TreasuryAllocationConfig {
  key: string;
  percentage: number;
  color: string;
}

export interface GovernancePolicyConfig {
  qualification_threshold_percent: number;
  anti_spam_min_hours_between_proposals: number;
  override_ttl_days: number;
  override_requires_council_review: boolean;
}

export interface SprintPolicyConfig {
  dispute_window_hours: number;
  reviewer_sla_hours: number;
  reviewer_sla_extension_hours: number;
}

export interface RewardsConfig {
  enabled: boolean;
  points_to_token_rate: number;
  min_claim_threshold: number;
  default_epoch_pool: number;
  claim_requires_wallet: boolean;
  settlement_emission_percent?: number;
  settlement_fixed_cap_per_sprint?: number;
  settlement_carryover_sprint_cap?: number;
  treasury_balance_for_emission?: number;
}

export interface TokenAnalyticsConfig {
  lp_vault_exclusions: string[];
  dexscreener_pair: string | null;
}

export interface TranslationSettingsConfig {
  posts: boolean;
  proposals: boolean;
  ideas: boolean;
  tasks: boolean;
  comments: boolean;
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
  token_analytics_config: TokenAnalyticsConfig;
  // Treasury config
  treasury_wallet: string | null;
  treasury_allocations: TreasuryAllocationConfig[];
  // Sprint defaults
  default_sprint_capacity: number;
  default_sprint_duration_days: number;
  // Organic ID config
  organic_id_threshold: number | null;
  governance_policy: GovernancePolicyConfig | null;
  sprint_policy: SprintPolicyConfig | null;
  // Rewards config
  rewards_config: RewardsConfig | null;
  // Translation per-content-type toggles
  translation_settings: TranslationSettingsConfig;
  // Branding (tenant identity / visuals / socials)
  community_handle: string | null;
  tagline: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  brand_color_primary: string | null;
  brand_color_secondary: string | null;
  footer_note: string | null;
  is_platform_owner: boolean;
  social_x: string | null;
  social_telegram: string | null;
  social_discord: string | null;
  social_youtube: string | null;
  social_tiktok: string | null;
  social_website: string | null;
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
  | 'branding'
  | 'token'
  | 'treasury'
  | 'governance'
  | 'sprints'
  | 'members'
  | 'rewards'
  | 'gamification'
  | 'campaigns'
  | 'translation';

export const SETTINGS_TABS: { key: SettingsTab; labelKey: string; icon: string }[] = [
  { key: 'general', labelKey: 'Settings.tabs.general', icon: 'Settings' },
  { key: 'branding', labelKey: 'Settings.tabs.branding', icon: 'Palette' },
  { key: 'token', labelKey: 'Settings.tabs.token', icon: 'Coins' },
  { key: 'treasury', labelKey: 'Settings.tabs.treasury', icon: 'Wallet' },
  { key: 'governance', labelKey: 'Settings.tabs.governance', icon: 'Vote' },
  { key: 'sprints', labelKey: 'Settings.tabs.sprints', icon: 'Zap' },
  { key: 'members', labelKey: 'Settings.tabs.members', icon: 'Users' },
  { key: 'rewards', labelKey: 'Settings.tabs.rewards', icon: 'Gift' },
  { key: 'gamification', labelKey: 'Settings.tabs.gamification', icon: 'Sparkles' },
  { key: 'campaigns', labelKey: 'Settings.tabs.campaigns', icon: 'Megaphone' },
  { key: 'translation', labelKey: 'Settings.tabs.translation', icon: 'Languages' },
];
