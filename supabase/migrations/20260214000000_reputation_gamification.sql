-- ===========================================================================
-- Migration: Reputation & Gamification System (Phase 14)
-- Purpose: XP/levels (11 nature-themed tiers), achievements, streaks,
--          and activity counters — cosmetic only, no voting power impact
-- ===========================================================================

-- ─── 1. New columns on user_profiles ────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS xp_total       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level          INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- ─── 2. xp_events — audit log of every XP award ────────────────────────
CREATE TABLE IF NOT EXISTS xp_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,          -- maps to activity_event_type values
  source_type TEXT,                   -- 'task', 'proposal', 'vote', 'comment', 'achievement'
  source_id   UUID,                   -- nullable for achievements / streaks
  xp_amount   INTEGER NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedupe: prevent double-awarding for the same event
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_dedupe
  ON xp_events (user_id, event_type, source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created
  ON xp_events (user_id, created_at DESC);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all xp_events"
  ON xp_events FOR SELECT
  TO authenticated
  USING (true);

-- ─── 3. achievements — static definitions ───────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  icon              TEXT NOT NULL DEFAULT '🏆',
  category          TEXT NOT NULL,     -- contribution, governance, community, milestone
  condition_type    TEXT NOT NULL,      -- 'counter' or 'threshold'
  condition_field   TEXT NOT NULL,      -- field name in user_activity_counts or user_profiles
  condition_threshold INTEGER NOT NULL,
  xp_reward         INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read achievements"
  ON achievements FOR SELECT
  USING (true);

-- ─── 4. user_achievements — junction table ──────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements (user_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all user_achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (true);

-- ─── 5. user_activity_counts — materialized counters ────────────────────
CREATE TABLE IF NOT EXISTS user_activity_counts (
  user_id           UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  tasks_completed   INTEGER NOT NULL DEFAULT 0,
  votes_cast        INTEGER NOT NULL DEFAULT 0,
  proposals_created INTEGER NOT NULL DEFAULT 0,
  comments_created  INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_activity_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_activity_counts"
  ON user_activity_counts FOR SELECT
  USING (true);

-- ─── 6. Extend orgs with gamification config ────────────────────────────
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS gamification_config JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "xp_per_task_point": 10,
    "xp_vote_cast": 15,
    "xp_proposal_created": 50,
    "xp_comment_created": 5
  }'::jsonb;

-- ─── 7. calculate_level_from_xp — pure IMMUTABLE function ──────────────
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN xp >= 80000 THEN 11
    WHEN xp >= 40000 THEN 10
    WHEN xp >= 20000 THEN 9
    WHEN xp >= 10000 THEN 8
    WHEN xp >= 5000  THEN 7
    WHEN xp >= 2500  THEN 6
    WHEN xp >= 1200  THEN 5
    WHEN xp >= 600   THEN 4
    WHEN xp >= 300   THEN 3
    WHEN xp >= 100   THEN 2
    ELSE 1
  END;
$$;

-- ─── 8. award_xp — AFTER INSERT ON activity_log trigger ────────────────
CREATE OR REPLACE FUNCTION award_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_id  UUID;
  v_xp        INTEGER;
  v_config    JSONB;
  v_new_xp    INTEGER;
  v_today     DATE := CURRENT_DATE;
  v_last_date DATE;
  v_streak    INTEGER;
BEGIN
  v_actor_id := NEW.actor_id;

  -- Skip events without an actor
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read gamification config from the org
  SELECT gamification_config INTO v_config
  FROM orgs LIMIT 1;

  -- If gamification is disabled, skip
  IF v_config IS NULL OR (v_config->>'enabled')::boolean IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Determine XP amount based on event type
  v_xp := CASE NEW.event_type::text
    WHEN 'task_completed' THEN
      GREATEST(1, COALESCE((NEW.metadata->>'points')::integer, 1))
        * COALESCE((v_config->>'xp_per_task_point')::integer, 10)
    WHEN 'vote_cast' THEN
      COALESCE((v_config->>'xp_vote_cast')::integer, 15)
    WHEN 'proposal_created' THEN
      COALESCE((v_config->>'xp_proposal_created')::integer, 50)
    WHEN 'comment_created' THEN
      COALESCE((v_config->>'xp_comment_created')::integer, 5)
    ELSE 0
  END;

  -- Skip non-XP events
  IF v_xp <= 0 THEN
    RETURN NEW;
  END IF;

  -- Insert XP event (idempotent via dedupe index)
  INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
  VALUES (
    v_actor_id,
    NEW.event_type::text,
    NEW.subject_type,
    NEW.subject_id,
    v_xp,
    jsonb_build_object('activity_log_id', NEW.id)
  )
  ON CONFLICT (user_id, event_type, source_type, source_id)
    WHERE source_id IS NOT NULL
  DO NOTHING;

  -- If the insert was a no-op (duplicate), skip the rest
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Update user XP total and level
  UPDATE user_profiles
  SET
    xp_total = xp_total + v_xp,
    level = calculate_level_from_xp(xp_total + v_xp)
  WHERE id = v_actor_id;

  -- Update streak
  SELECT last_active_date, current_streak
  INTO v_last_date, v_streak
  FROM user_profiles
  WHERE id = v_actor_id;

  IF v_last_date IS NULL OR v_last_date < v_today THEN
    IF v_last_date = v_today - INTERVAL '1 day' THEN
      -- Consecutive day: increment streak
      v_streak := COALESCE(v_streak, 0) + 1;
    ELSIF v_last_date IS NULL OR v_last_date < v_today - INTERVAL '1 day' THEN
      -- Gap: reset streak
      v_streak := 1;
    END IF;

    UPDATE user_profiles
    SET
      current_streak = v_streak,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), v_streak),
      last_active_date = v_today
    WHERE id = v_actor_id;
  END IF;

  -- Upsert activity counts
  INSERT INTO user_activity_counts (user_id, tasks_completed, votes_cast, proposals_created, comments_created, updated_at)
  VALUES (
    v_actor_id,
    CASE WHEN NEW.event_type::text = 'task_completed' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type::text = 'vote_cast' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type::text = 'proposal_created' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type::text = 'comment_created' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    tasks_completed   = user_activity_counts.tasks_completed + EXCLUDED.tasks_completed,
    votes_cast        = user_activity_counts.votes_cast + EXCLUDED.votes_cast,
    proposals_created = user_activity_counts.proposals_created + EXCLUDED.proposals_created,
    comments_created  = user_activity_counts.comments_created + EXCLUDED.comments_created,
    updated_at        = now();

  RETURN NEW;
END;
$$;

-- Create the trigger (AFTER INSERT on activity_log)
DROP TRIGGER IF EXISTS trigger_award_xp ON activity_log;
CREATE TRIGGER trigger_award_xp
  AFTER INSERT ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION award_xp();

-- ─── 9. check_achievements — RPC function ───────────────────────────────
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_id   TEXT,
  achievement_name TEXT,
  xp_reward        INTEGER,
  icon             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_achievement RECORD;
  v_field_value INTEGER;
  v_new_count   INTEGER := 0;
BEGIN
  FOR v_achievement IN
    SELECT a.*
    FROM achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = p_user_id
        AND ua.achievement_id = a.id
    )
  LOOP
    -- Get the current value for the condition field
    IF v_achievement.condition_field IN ('tasks_completed', 'votes_cast', 'proposals_created', 'comments_created') THEN
      EXECUTE format(
        'SELECT COALESCE(%I, 0) FROM user_activity_counts WHERE user_id = $1',
        v_achievement.condition_field
      ) INTO v_field_value USING p_user_id;
    ELSIF v_achievement.condition_field IN ('xp_total', 'current_streak') THEN
      EXECUTE format(
        'SELECT COALESCE(%I, 0) FROM user_profiles WHERE id = $1',
        v_achievement.condition_field
      ) INTO v_field_value USING p_user_id;
    ELSE
      v_field_value := 0;
    END IF;

    -- Check if threshold is met
    IF COALESCE(v_field_value, 0) >= v_achievement.condition_threshold THEN
      -- Award achievement
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      IF FOUND AND v_achievement.xp_reward > 0 THEN
        -- Award bonus XP for the achievement
        INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
        VALUES (
          p_user_id,
          'achievement_unlocked',
          'achievement',
          NULL,
          v_achievement.xp_reward,
          jsonb_build_object('achievement_id', v_achievement.id)
        );

        UPDATE user_profiles
        SET
          xp_total = xp_total + v_achievement.xp_reward,
          level = calculate_level_from_xp(xp_total + v_achievement.xp_reward)
        WHERE id = p_user_id;

        -- Return the newly unlocked achievement
        achievement_id := v_achievement.id;
        achievement_name := v_achievement.name;
        xp_reward := v_achievement.xp_reward;
        icon := v_achievement.icon;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- ─── 10. Seed 15 achievements ───────────────────────────────────────────
INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward)
VALUES
  ('first_task',     'First Harvest',         'Complete your first task',                    '🌾', 'contribution', 'counter', 'tasks_completed',   1,    25),
  ('tasks_5',        'Growing Season',        'Complete 5 tasks',                            '🌱', 'contribution', 'counter', 'tasks_completed',   5,    50),
  ('tasks_25',       'Seasoned Grower',        'Complete 25 tasks',                           '🌿', 'contribution', 'counter', 'tasks_completed',   25,   100),
  ('tasks_100',      'Master Cultivator',      'Complete 100 tasks',                          '🌳', 'contribution', 'counter', 'tasks_completed',   100,  200),
  ('first_vote',     'First Voice',            'Cast your first vote',                        '🗳️', 'governance',   'counter', 'votes_cast',        1,    15),
  ('voter_10',       'Active Citizen',         'Cast 10 votes',                               '⚖️', 'governance',   'counter', 'votes_cast',        10,   50),
  ('voter_50',       'Governance Pillar',      'Cast 50 votes',                               '🏛️', 'governance',   'counter', 'votes_cast',        50,   150),
  ('first_proposal', 'Idea Planter',           'Create your first proposal',                  '💡', 'governance',   'counter', 'proposals_created', 1,    30),
  ('proposals_5',    'Visionary',              'Create 5 proposals',                          '🔮', 'governance',   'counter', 'proposals_created', 5,    75),
  ('first_comment',  'Community Voice',        'Write your first comment',                    '💬', 'community',    'counter', 'comments_created',  1,    10),
  ('comments_50',    'Conversation Starter',   'Write 50 comments',                           '🗣️', 'community',    'counter', 'comments_created',  50,   75),
  ('streak_7',       'Consistent Grower',      'Maintain a 7-day activity streak',            '🔥', 'milestone',    'threshold', 'current_streak',  7,    100),
  ('streak_30',      'Unwavering',             'Maintain a 30-day activity streak',           '⚡', 'milestone',    'threshold', 'current_streak',  30,   500),
  ('xp_1000',        'Rising Star',            'Reach 1,000 XP',                              '⭐', 'milestone',    'threshold', 'xp_total',        1000, 50),
  ('xp_10000',       'Legend in the Making',   'Reach 10,000 XP',                             '🌟', 'milestone',    'threshold', 'xp_total',        10000, 200)
ON CONFLICT (id) DO NOTHING;

-- ─── 11. Update leaderboard_view to include XP / level / streak ─────────
DROP VIEW IF EXISTS leaderboard_view;
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  id,
  name,
  email,
  organic_id,
  avatar_url,
  total_points,
  tasks_completed,
  role,
  xp_total,
  level,
  current_streak,
  RANK() OVER (ORDER BY total_points DESC) as rank,
  DENSE_RANK() OVER (ORDER BY total_points DESC) as dense_rank
FROM user_profiles
WHERE organic_id IS NOT NULL
ORDER BY total_points DESC;

GRANT SELECT ON leaderboard_view TO authenticated;
GRANT SELECT ON leaderboard_view TO anon;

-- ─── 12. Backfill existing users ────────────────────────────────────────
-- Compute XP from existing total_points (task_points * 10)
-- Plus historical vote/proposal/comment counts from activity_log
DO $$
DECLARE
  v_user RECORD;
  v_xp   INTEGER;
BEGIN
  FOR v_user IN
    SELECT
      up.id,
      up.total_points,
      COALESCE(counts.votes, 0) AS votes,
      COALESCE(counts.proposals, 0) AS proposals,
      COALESCE(counts.comments, 0) AS comments
    FROM user_profiles up
    LEFT JOIN (
      SELECT
        actor_id,
        COUNT(*) FILTER (WHERE event_type = 'vote_cast') AS votes,
        COUNT(*) FILTER (WHERE event_type = 'proposal_created') AS proposals,
        COUNT(*) FILTER (WHERE event_type = 'comment_created') AS comments
      FROM activity_log
      WHERE actor_id IS NOT NULL
      GROUP BY actor_id
    ) counts ON counts.actor_id = up.id
  LOOP
    v_xp := COALESCE(v_user.total_points, 0) * 10
           + v_user.votes * 15
           + v_user.proposals * 50
           + v_user.comments * 5;

    UPDATE user_profiles
    SET
      xp_total = v_xp,
      level = calculate_level_from_xp(v_xp)
    WHERE id = v_user.id;

    -- Seed activity counts
    INSERT INTO user_activity_counts (user_id, tasks_completed, votes_cast, proposals_created, comments_created)
    SELECT
      v_user.id,
      COALESCE(v_user.tasks_completed, 0),  -- corrected in UPDATE below for accuracy
      v_user.votes,
      v_user.proposals,
      v_user.comments
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Fix the activity_counts tasks_completed using the actual column
UPDATE user_activity_counts uac
SET tasks_completed = up.tasks_completed
FROM user_profiles up
WHERE uac.user_id = up.id;

-- ─── 13. Indexes for performance ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_xp
  ON user_profiles (xp_total DESC);

CREATE INDEX IF NOT EXISTS idx_user_profiles_level
  ON user_profiles (level);
