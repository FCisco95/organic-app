-- ===========================================================================
-- Migration: Quests, Referrals & Burn-to-Level System
-- Purpose: DB-driven quests (replacing hardcoded), referral program,
--          burn-to-level mechanic, and admin gamification config
-- ===========================================================================

-- ─── 1A. quests table (replaces hardcoded quest definitions) ──────────────
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cadence TEXT NOT NULL CHECK (cadence IN ('daily','weekly','long_term','event')),
  metric_type TEXT NOT NULL,
  target_value INT NOT NULL CHECK (target_value > 0),
  unit TEXT NOT NULL DEFAULT '',
  xp_reward INT NOT NULL DEFAULT 0,
  points_reward INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  icon TEXT DEFAULT '🎯',
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quests_org_active ON quests (org_id, is_active);

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quests"
  ON quests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert quests"
  ON quests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );

CREATE POLICY "Admins can update quests"
  ON quests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );

CREATE POLICY "Admins can delete quests"
  ON quests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Seed the 9 existing hardcoded quest definitions
INSERT INTO quests (title, description, cadence, metric_type, target_value, unit, xp_reward, points_reward, icon, sort_order) VALUES
  ('Daily Builder', 'Complete at least 1 task today.', 'daily', 'daily_tasks_completed', 1, 'tasks', 25, 10, '🔨', 10),
  ('Daily Signal', 'Cast at least 1 governance vote today.', 'daily', 'daily_votes_cast', 1, 'votes', 20, 5, '📡', 20),
  ('XP Burst', 'Earn 150 XP in one day.', 'daily', 'daily_xp_earned', 150, 'xp', 30, 15, '⚡', 30),
  ('Weekly Momentum', 'Complete 5 tasks this week.', 'weekly', 'weekly_tasks_completed', 5, 'tasks', 75, 30, '🚀', 40),
  ('Governance Pulse', 'Take 3 governance actions (votes or proposals) this week.', 'weekly', 'weekly_governance_actions', 3, 'actions', 60, 25, '🗳️', 50),
  ('Consistent Presence', 'Be active on 4 different days this week.', 'weekly', 'weekly_active_days', 4, 'days', 50, 20, '📅', 60),
  ('Reach Level 5', 'Progress your account to level 5.', 'long_term', 'long_term_level', 5, 'level', 200, 100, '⭐', 70),
  ('Achievement Hunter', 'Unlock 10 achievements.', 'long_term', 'long_term_achievements', 10, 'achievements', 150, 75, '🏆', 80),
  ('Streak Master', 'Maintain a 30-day activity streak.', 'long_term', 'long_term_streak', 30, 'days', 300, 150, '🔥', 90)
ON CONFLICT DO NOTHING;

-- ─── 1B. referral_codes table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes (user_id);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own referral codes"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own referral codes"
  ON referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Allow public SELECT for code validation during signup
CREATE POLICY "Anyone can validate referral codes"
  ON referral_codes FOR SELECT
  TO anon
  USING (true);

-- ─── 1C. referrals table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES user_profiles(id),
  referred_id UUID NOT NULL REFERENCES user_profiles(id),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read referrals they are part of"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_id = (SELECT auth.uid()) OR referred_id = (SELECT auth.uid()));

-- ─── 1D. referral_rewards table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id),
  referrer_id UUID NOT NULL REFERENCES user_profiles(id),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('xp','points')),
  amount INT NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards (referrer_id);

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own referral rewards"
  ON referral_rewards FOR SELECT
  TO authenticated
  USING (referrer_id = (SELECT auth.uid()));

-- ─── 1E. point_burns table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS point_burns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  points_burned INT NOT NULL CHECK (points_burned > 0),
  from_level INT NOT NULL,
  to_level INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_burns_user ON point_burns (user_id);

ALTER TABLE point_burns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own point burns"
  ON point_burns FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ─── 1F. Extend gamification_config with new keys ────────────────────────
UPDATE orgs
SET gamification_config = gamification_config || '{
  "leveling_mode": "auto",
  "burn_cost_multiplier": 1.0,
  "referral_enabled": true,
  "referral_xp_per_signup": 100,
  "referral_point_share_percent": 5,
  "referral_share_duration_days": 30,
  "referral_tiers": [
    {"name": "Bronze", "min": 1, "max": 5, "multiplier": 1.0},
    {"name": "Silver", "min": 6, "max": 15, "multiplier": 1.25},
    {"name": "Gold", "min": 16, "max": null, "multiplier": 1.5}
  ]
}'::jsonb
WHERE NOT gamification_config ? 'leveling_mode';

-- ─── 1G. Update award_xp trigger to respect leveling_mode ───────────────
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
  v_leveling_mode TEXT;
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

  -- Check leveling mode
  v_leveling_mode := COALESCE(v_config->>'leveling_mode', 'auto');

  -- Update user XP total (and level only if auto mode)
  IF v_leveling_mode = 'manual_burn' THEN
    UPDATE user_profiles
    SET xp_total = xp_total + v_xp
    WHERE id = v_actor_id;
  ELSE
    UPDATE user_profiles
    SET
      xp_total = xp_total + v_xp,
      level = calculate_level_from_xp(xp_total + v_xp)
    WHERE id = v_actor_id;
  END IF;

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
