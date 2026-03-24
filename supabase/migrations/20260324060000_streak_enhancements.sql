-- ============================================================================
-- C5: Streak Enhancements
-- Streak freezes, milestones, danger notifications
-- ============================================================================

-- ─── Streak freezes column on user_profiles ───────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS streak_freezes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freeze_used_at DATE,
  ADD COLUMN IF NOT EXISTS streak_milestone_claimed INTEGER NOT NULL DEFAULT 0;

-- Constraint: max 3 freezes stockpiled
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS chk_streak_freezes_max;
ALTER TABLE user_profiles
  ADD CONSTRAINT chk_streak_freezes_max CHECK (streak_freezes >= 0 AND streak_freezes <= 3);

-- ─── Activity event types ─────────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'streak_freeze_earned';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'streak_freeze_used';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'streak_milestone';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ─── Streak milestone definitions ────────────────────────────────────
-- Milestones at 7, 14, 30, 60, 100 days
-- XP bonuses: 25, 50, 100, 200, 500
-- These are tracked in gamification_config and checked by the streak service
