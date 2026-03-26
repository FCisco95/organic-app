// ─── Personal Analytics Types ────────────────────────────────────────────────

export interface PersonalStats {
  xp_total: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  claimable_points: number;
  tasks_completed: number;
}

export interface XpTrendPoint {
  day: string;
  xp_earned: number;
}

export interface ActivityHeatmapDay {
  date: string;
  count: number;
}

export interface EngagementBreakdown {
  posts_created: number;
  comments_made: number;
  likes_given: number;
  likes_received: number;
}

export interface SubmissionBreakdown {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface PersonalAnalyticsData {
  stats: PersonalStats;
  xp_trend: XpTrendPoint[];
  activity_heatmap: ActivityHeatmapDay[];
  engagement: EngagementBreakdown;
  submissions: SubmissionBreakdown;
}
