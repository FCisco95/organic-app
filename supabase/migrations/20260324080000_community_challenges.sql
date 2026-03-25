-- =============================================================================
-- Community Challenges Schema
-- =============================================================================
-- Shared community-wide goals where everyone earns bonus rewards when the
-- community collectively hits a target. Schema only — no API routes or UI.
--
-- Example: "Community completes 500 tasks this week" → everyone gets 50 XP bonus
-- =============================================================================

-- Enum for challenge status
DO $$ BEGIN
  CREATE TYPE challenge_status AS ENUM (
    'draft', 'active', 'completed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- community_challenges: Shared goals with collective progress
-- =============================================================================
CREATE TABLE IF NOT EXISTS community_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  metric_type     TEXT NOT NULL,           -- e.g. 'tasks_completed', 'votes_cast', 'ideas_created'
  target_value    INTEGER NOT NULL CHECK (target_value > 0),
  current_value   INTEGER NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  reward_xp       INTEGER NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
  reward_points   INTEGER NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
  status          challenge_status NOT NULL DEFAULT 'draft',
  start_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- end_date must be after start_date
  CONSTRAINT chk_challenge_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_community_challenges_status ON community_challenges(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_community_challenges_dates ON community_challenges(start_date, end_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_community_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_challenges_updated_at ON community_challenges;
CREATE TRIGGER trg_community_challenges_updated_at
  BEFORE UPDATE ON community_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_community_challenges_updated_at();

-- RLS
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active challenges"
  ON community_challenges FOR SELECT
  USING (status IN ('active', 'completed'));

CREATE POLICY "Service role full access community_challenges"
  ON community_challenges FOR ALL
  USING (auth.role() = 'service_role');
