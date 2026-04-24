-- Migration: X Engagement Rewards — activity_event_type + notification_category extensions
--
-- Postgres requires ALTER TYPE … ADD VALUE to run in its own transaction from
-- any usage of the new value, so these are split from the main schema migration.

ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'x_engagement_like';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'x_engagement_retweet';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'x_engagement_comment';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'x_engagement_sprint_bonus';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'x_engagement_appeal_opened';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'x_engagement_appeal_resolved';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_category') THEN
    ALTER TYPE notification_category ADD VALUE IF NOT EXISTS 'engagement';
  END IF;
END
$$;
