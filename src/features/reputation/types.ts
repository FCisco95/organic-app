// ─── Reputation Level System ────────────────────────────────────────────

export interface ReputationLevel {
  level: number;
  name: string;
  xpRequired: number;
  color: string;
}

export const REPUTATION_LEVELS: readonly ReputationLevel[] = [
  { level: 1, name: 'Seed', xpRequired: 0, color: '#8B7355' },
  { level: 2, name: 'Sprout', xpRequired: 100, color: '#90EE90' },
  { level: 3, name: 'Sapling', xpRequired: 300, color: '#3CB371' },
  { level: 4, name: 'Vine', xpRequired: 600, color: '#2E8B57' },
  { level: 5, name: 'Branch', xpRequired: 1_200, color: '#228B22' },
  { level: 6, name: 'Trunk', xpRequired: 2_500, color: '#6B4226' },
  { level: 7, name: 'Bloom', xpRequired: 5_000, color: '#FF6B6B' },
  { level: 8, name: 'Grove', xpRequired: 10_000, color: '#2F4F4F' },
  { level: 9, name: 'Forest', xpRequired: 20_000, color: '#006400' },
  { level: 10, name: 'Canopy', xpRequired: 40_000, color: '#FFD700' },
  { level: 11, name: 'Ancient Oak', xpRequired: 80_000, color: '#DAA520' },
] as const;

/** Get level info by level number (1-based) */
export function getLevelInfo(level: number): ReputationLevel {
  const clamped = Math.max(1, Math.min(11, level));
  return REPUTATION_LEVELS[clamped - 1];
}

/** Get XP progress toward next level (0–100 percentage) */
export function getXpProgress(xpTotal: number, level: number): number {
  const currentLevel = getLevelInfo(level);
  const nextLevel = level < 11 ? getLevelInfo(level + 1) : null;

  if (!nextLevel) return 100; // Max level

  const xpIntoLevel = xpTotal - currentLevel.xpRequired;
  const xpForNextLevel = nextLevel.xpRequired - currentLevel.xpRequired;

  if (xpForNextLevel <= 0) return 100;
  return Math.min(100, Math.max(0, (xpIntoLevel / xpForNextLevel) * 100));
}

/** Get XP remaining until next level */
export function getXpRemaining(xpTotal: number, level: number): number {
  if (level >= 11) return 0;
  const nextLevel = getLevelInfo(level + 1);
  return Math.max(0, nextLevel.xpRequired - xpTotal);
}

// ─── XP Events ─────────────────────────────────────────────────────────

export interface XpEvent {
  id: string;
  user_id: string;
  event_type: string;
  source_type: string | null;
  source_id: string | null;
  xp_amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const XP_SOURCE_LABELS: Record<string, string> = {
  task_completed: 'Task completed',
  vote_cast: 'Vote cast',
  proposal_created: 'Proposal created',
  comment_created: 'Comment posted',
  achievement_unlocked: 'Achievement bonus',
};

// ─── Achievements ──────────────────────────────────────────────────────

export type AchievementCategory = 'contribution' | 'governance' | 'community' | 'milestone';

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  'contribution',
  'governance',
  'community',
  'milestone',
];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  contribution: 'Contribution',
  governance: 'Governance',
  community: 'Community',
  milestone: 'Milestone',
};

export const ACHIEVEMENT_CATEGORY_COLORS: Record<AchievementCategory, string> = {
  contribution: 'bg-green-100 text-green-700',
  governance: 'bg-purple-100 text-purple-700',
  community: 'bg-blue-100 text-blue-700',
  milestone: 'bg-amber-100 text-amber-700',
};

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition_type: string;
  condition_field: string;
  condition_threshold: number;
  xp_reward: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlocked_at: string | null;
}

// ─── User Reputation (composite) ───────────────────────────────────────

export interface UserReputation {
  xp_total: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  total_points: number;
  tasks_completed: number;
  achievement_count: number;
  recent_xp_events: XpEvent[];
  recent_achievements: AchievementWithStatus[];
}

// ─── Leaderboard (XP-first posture) ───────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
  avatar_url: string | null;
  total_points: number;
  tasks_completed: number;
  role: string;
  rank: number;
  xp_total: number;
  level: number | null;
  current_streak: number | null;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

type LeaderboardSortInput = Pick<LeaderboardEntry, 'id' | 'xp_total' | 'total_points' | 'tasks_completed'>;

function toNonNegativeNumber(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, value);
}

/**
 * Sort order for public leaderboard:
 * 1) XP total (desc), 2) points (desc), 3) tasks completed (desc), 4) id (asc).
 */
export function compareLeaderboardEntries(
  left: LeaderboardSortInput,
  right: LeaderboardSortInput
): number {
  const xpDiff = toNonNegativeNumber(right.xp_total) - toNonNegativeNumber(left.xp_total);
  if (xpDiff !== 0) return xpDiff;

  const pointsDiff =
    toNonNegativeNumber(right.total_points) - toNonNegativeNumber(left.total_points);
  if (pointsDiff !== 0) return pointsDiff;

  const tasksDiff =
    toNonNegativeNumber(right.tasks_completed) - toNonNegativeNumber(left.tasks_completed);
  if (tasksDiff !== 0) return tasksDiff;

  return left.id.localeCompare(right.id);
}

export function rankLeaderboardEntries<T extends LeaderboardSortInput>(
  entries: T[]
): Array<T & { rank: number }> {
  const sorted = [...entries].sort(compareLeaderboardEntries);
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

// ─── Check Level-Up Response ───────────────────────────────────────────

export interface NewAchievement {
  achievement_id: string;
  achievement_name: string;
  xp_reward: number;
  icon: string;
}

export interface CheckLevelUpResponse {
  newAchievements: NewAchievement[];
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
}
