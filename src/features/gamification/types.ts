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

export type QuestCadence = 'daily' | 'weekly' | 'long_term';

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
}

export interface QuestProgressResponse {
  generated_at: string;
  objectives: {
    daily: QuestProgressItem[];
    weekly: QuestProgressItem[];
    long_term: QuestProgressItem[];
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
