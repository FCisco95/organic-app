-- ============================================================================
-- C3: Donation System
-- Tables: donations
-- On-chain SOL/ORG donations to DAO treasury with verification + badge tiers
-- ============================================================================

-- Donation status enum
DO $$ BEGIN
  CREATE TYPE donation_status AS ENUM ('pending', 'verified', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Donation token enum
DO $$ BEGIN
  CREATE TYPE donation_token AS ENUM ('SOL', 'ORG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Donations table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS donations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_signature  TEXT NOT NULL UNIQUE,
  donor_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token         donation_token NOT NULL DEFAULT 'SOL',
  amount        NUMERIC(20,9) NOT NULL CHECK (amount > 0),
  amount_usd    NUMERIC(14,2),
  from_wallet   TEXT NOT NULL,
  to_wallet     TEXT NOT NULL,
  status        donation_status NOT NULL DEFAULT 'pending',
  verified_at   TIMESTAMPTZ,
  failed_reason TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_from_wallet ON donations(from_wallet);

-- ─── Donation badge tiers in gamification_config ──────────────────────
-- Badge tiers are read from gamification_config JSONB, not a separate table.
-- Default tiers:
--   Seed Planter:     $1 - $49 cumulative
--   Grove Grower:     $50 - $249
--   Forest Guardian:  $250 - $999
--   Canopy Keeper:    $1000+

-- ─── Activity event type extensions ──────────────────────────────────

-- Add donation events to activity_event_type enum if it exists
DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'donation_submitted';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'donation_verified';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ─── Updated_at trigger ──────────────────────────────────────────────

CREATE OR REPLACE TRIGGER set_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Anyone can view verified donations
CREATE POLICY "donations_select_verified"
  ON donations FOR SELECT
  USING (status = 'verified');

-- Donors can see their own donations (any status)
CREATE POLICY "donations_select_own"
  ON donations FOR SELECT
  USING (donor_id = auth.uid());

-- Authenticated users can submit donations
CREATE POLICY "donations_insert_own"
  ON donations FOR INSERT
  WITH CHECK (donor_id = auth.uid());

-- Only service role updates donations (for verification)
-- No user-facing UPDATE policy needed
