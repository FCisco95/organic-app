import type { AchievementWithStatus, XpEvent } from '@/features/reputation';

export interface LevelProgress {
  level: number;
  level_name: string;
  xp_total: number;
  progress_percent: number;
  xp_to_next_level: number;
  xp_in_level: number;
  xp_for_next_level: number;
  is_max_level: boolean;
}

export interface RewardsReadiness {
  claimable_points: number;
  pending_claims: number;
  conversion_rate: number;
  min_threshold: number;
  rewards_enabled: boolean;
  claim_requires_wallet: boolean;
  wallet_address: string | null;
}

export type QuestCadence = 'daily' | 'weekly' | 'long_term' | 'event';

export interface QuestSummaryItem {
  id: string;
  cadence: QuestCadence;
  title: string;
  progress: number;
  target: number;
  unit: string;
  completed: boolean;
}

export interface QuestSummary {
  completed: number;
  total: number;
  items: QuestSummaryItem[];
  note: string | null;
}

export interface QuestProgressItem extends QuestSummaryItem {
  description: string;
  progress_percent: number;
  remaining: number;
  reset_at: string | null;
  xp_reward: number;
  points_reward: number;
  icon: string;
}

export interface QuestProgressResponse {
  generated_at: string;
  objectives: {
    daily: QuestProgressItem[];
    weekly: QuestProgressItem[];
    long_term: QuestProgressItem[];
    event: QuestProgressItem[];
  };
  summary: QuestSummary;
}

export interface GamificationOverview {
  xp_total: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  tasks_completed: number;
  achievement_count: number;
  level_progress: LevelProgress;
  rewards: RewardsReadiness;
  recent_xp_events: XpEvent[];
  achievements: AchievementWithStatus[];
  quest_summary: QuestSummary;
}

// ─── Quest DB Row ───────────────────────────────────────────────────────

export interface QuestDefinitionRow {
  id: string;
  org_id: string | null;
  title: string;
  description: string;
  cadence: QuestCadence;
  metric_type: string;
  target_value: number;
  unit: string;
  xp_reward: number;
  points_reward: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Referral System ────────────────────────────────────────────────────

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
}

export interface ReferralTier {
  name: string;
  min: number;
  max: number | null;
  multiplier: number;
}

export interface ReferralStats {
  code: string;
  referral_link: string;
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_xp_earned: number;
  total_points_earned: number;
  current_tier: ReferralTier;
}

// ─── Burn-to-Level ──────────────────────────────────────────────────────

export interface BurnCostInfo {
  current_level: number;
  next_level: number;
  current_xp: number;
  xp_for_next_level: number;
  points_cost: number;
  available_points: number;
  can_burn: boolean;
  leveling_mode: 'auto' | 'manual_burn';
}

// ─── Gamification Config ────────────────────────────────────────────────

export interface GamificationConfig {
  enabled: boolean;
  xp_per_task_point: number;
  xp_vote_cast: number;
  xp_proposal_created: number;
  xp_comment_created: number;
  leveling_mode: 'auto' | 'manual_burn';
  burn_cost_multiplier: number;
  referral_enabled: boolean;
  referral_xp_per_signup: number;
  referral_point_share_percent: number;
  referral_share_duration_days: number;
  referral_tiers: ReferralTier[];
}
