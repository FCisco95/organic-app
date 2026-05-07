/**
 * Single source of truth for activity-log event types.
 *
 * Mirrors the `activity_event_type` Postgres enum defined across
 * `supabase/migrations/`. Add a new entry here whenever a migration
 * extends the enum, then add matching translations under
 * `dashboard.activity.<event_type>` in every locale file under
 * `messages/`. The `tests/features/dashboard/activity-i18n.test.ts`
 * regression test enforces parity.
 */
export const KNOWN_ACTIVITY_EVENT_TYPES = [
  // 20260201000000_create_activity_log.sql
  'task_created',
  'task_status_changed',
  'task_completed',
  'task_deleted',
  'submission_created',
  'submission_reviewed',
  'comment_created',
  'comment_deleted',
  'proposal_created',
  'proposal_status_changed',
  'proposal_deleted',
  'vote_cast',
  // 20260208050000_notifications_batching_and_reminders.sql
  'voting_reminder_24h',
  'voting_reminder_1h',
  // 20260216100000_dispute_resolution.sql
  'dispute_created',
  'dispute_response_submitted',
  'dispute_escalated',
  'dispute_resolved',
  'dispute_withdrawn',
  // 20260324000000_ideas_xp_hooks_and_quests.sql
  'idea_created',
  'idea_voted',
  'idea_promoted_winner',
  // 20260324030000_community_posts_system.sql
  'post_created',
  'post_liked',
  'post_commented',
  // 20260324040000_donation_system.sql
  'donation_submitted',
  'donation_verified',
  // 20260324050000_holding_rewards_diamond_hands.sql
  'holding_sync',
  'holding_reward',
  // 20260324060000_streak_enhancements.sql
  'streak_freeze_earned',
  'streak_freeze_used',
  'streak_milestone',
  // 20260326200000_points_economy.sql
  'post_like_received',
  'post_comment_received',
  'post_promoted',
  'post_flagged',
  // 20260424000100_engagement_event_types.sql
  'x_engagement_like',
  'x_engagement_retweet',
  'x_engagement_comment',
  'x_engagement_sprint_bonus',
  'x_engagement_appeal_opened',
  'x_engagement_appeal_resolved',
  // 20260428100000_testimonial_event_type.sql
  'testimonial_approved',
  // Easter campaign — written by API routes (not yet in DB enum, kept for
  // forward compatibility with the icon map in `<ActivityItem />`).
  'egg_found',
] as const;

export type ActivityEventType = (typeof KNOWN_ACTIVITY_EVENT_TYPES)[number];

export interface ActivityEvent {
  id: string;
  event_type: ActivityEventType;
  actor_id: string | null;
  subject_type: string;
  subject_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: {
    id: string;
    name: string | null;
    organic_id: number | null;
    avatar_url: string | null;
  } | null;
}

export interface DashboardStats {
  total_users: number;
  org_holders: number;
  tasks_completed: number;
  active_proposals: number;
  org_price: number | null;
}
