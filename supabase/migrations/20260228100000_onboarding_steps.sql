-- Phase 20a: Onboarding Steps Tracking
-- Tracks per-user progress through the 4-step onboarding wizard

-- 1. Create onboarding_steps table
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('connect_wallet', 'verify_token', 'pick_task', 'join_sprint')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, step)
);

-- 2. RLS: users can only read/insert their own rows
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding steps"
  ON onboarding_steps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding steps"
  ON onboarding_steps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Add denormalized completion flag to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 4. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user_id
  ON onboarding_steps(user_id);

-- 5. Seed onboarding starter quests (requires quest_definitions table from gamification phase)
-- Run separately if quest_definitions exists:
-- INSERT INTO quest_definitions (id, title, description, cadence, metric_type, target_value, unit, xp_reward, points_reward, is_active, icon, sort_order)
-- VALUES
--   (gen_random_uuid(), 'Complete Profile', 'Fill in your profile details to get started', 'event', 'onboarding_profile', 1, 'profile', 50, 0, true, '👤', 1),
--   (gen_random_uuid(), 'First Task Submission', 'Submit your first task for review', 'event', 'onboarding_first_task', 1, 'submission', 75, 0, true, '📝', 2),
--   (gen_random_uuid(), 'First Vote', 'Cast your first vote on a proposal', 'event', 'onboarding_first_vote', 1, 'vote', 50, 0, true, '🗳️', 3),
--   (gen_random_uuid(), 'Complete Onboarding', 'Finish all onboarding steps', 'event', 'onboarding_complete', 1, 'wizard', 100, 0, true, '🎓', 4)
-- ON CONFLICT DO NOTHING;
