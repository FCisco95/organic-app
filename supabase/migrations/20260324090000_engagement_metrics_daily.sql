-- =============================================================================
-- Admin Engagement Dashboard Schema
-- =============================================================================
-- Daily aggregated engagement metrics for the admin dashboard.
-- Schema only — no API routes or UI. Data will be populated by a future
-- scheduled job that aggregates from activity_log, user_profiles, and
-- gamification tables.
--
-- One row per day. Designed for time-series queries and trend visualization.
-- =============================================================================

CREATE TABLE IF NOT EXISTS engagement_metrics_daily (
  date                DATE PRIMARY KEY,
  dau                 INTEGER NOT NULL DEFAULT 0,   -- daily active users
  wau                 INTEGER NOT NULL DEFAULT 0,   -- weekly active users (rolling 7d)
  mau                 INTEGER NOT NULL DEFAULT 0,   -- monthly active users (rolling 30d)
  new_users           INTEGER NOT NULL DEFAULT 0,   -- new registrations this day
  quest_completions   INTEGER NOT NULL DEFAULT 0,   -- quests completed this day
  achievement_unlocks INTEGER NOT NULL DEFAULT 0,   -- achievements unlocked this day
  xp_issued           INTEGER NOT NULL DEFAULT 0,   -- total XP awarded this day
  xp_burned           INTEGER NOT NULL DEFAULT 0,   -- total XP spent/burned this day
  avg_streak          NUMERIC(6,2) NOT NULL DEFAULT 0, -- average active streak length
  retention_7d        NUMERIC(5,2),                 -- 7-day retention rate (%)
  retention_30d       NUMERIC(5,2),                 -- 30-day retention rate (%)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for range queries on dashboard date pickers
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_daily_date
  ON engagement_metrics_daily(date DESC);

-- RLS: admin/service-role only
ALTER TABLE engagement_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access engagement_metrics_daily"
  ON engagement_metrics_daily FOR ALL
  USING (auth.role() = 'service_role');
