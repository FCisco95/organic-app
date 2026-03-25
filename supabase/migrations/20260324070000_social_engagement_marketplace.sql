-- =============================================================================
-- Social Engagement Marketplace Schema (GATED)
-- =============================================================================
-- This schema supports a future marketplace where users spend points to boost
-- their Twitter/X posts and other members earn points by engaging with them.
--
-- STATUS: Schema only. Feature is gated behind isMarketplaceEnabled() = false.
-- No API routes or UI are active. Tables exist for future activation.
--
-- BUSINESS RULES (to be enforced when marketplace is enabled):
--   1. Self-engagement blocked: engager_id != boost_requests.user_id (DB trigger)
--   2. Linked Twitter account required to create boosts
--   3. Minimum account age: 7 days before a user can create boosts
--   4. Minimum Level 2 required to create boosts
--   5. Maximum 3 active boosts per user at any time
--   6. Maximum 20 engagements per user per day
--   7. Boost expiry: 72 hours after creation, status → expired, escrow refunded
--   8. Verification via existing TwitterClient service
-- =============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE boost_request_status AS ENUM (
    'pending', 'active', 'completed', 'expired', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_proof_type AS ENUM (
    'like', 'retweet', 'comment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_proof_status AS ENUM (
    'pending', 'verified', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE escrow_status AS ENUM (
    'held', 'released', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- boost_requests: User pays points to boost a tweet
-- =============================================================================
CREATE TABLE IF NOT EXISTS boost_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tweet_url         TEXT NOT NULL,
  points_offered    INTEGER NOT NULL CHECK (points_offered > 0),
  max_engagements   INTEGER NOT NULL CHECK (max_engagements > 0),
  current_engagements INTEGER NOT NULL DEFAULT 0,
  status            boost_request_status NOT NULL DEFAULT 'pending',
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boost_requests_user_id ON boost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_requests_status ON boost_requests(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_boost_requests_expires_at ON boost_requests(expires_at) WHERE status = 'active';

-- =============================================================================
-- engagement_proofs: Engager submits proof of like/retweet/comment
-- =============================================================================
CREATE TABLE IF NOT EXISTS engagement_proofs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id      UUID NOT NULL REFERENCES boost_requests(id) ON DELETE CASCADE,
  engager_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  proof_type    engagement_proof_type NOT NULL,
  proof_url     TEXT,
  status        engagement_proof_status NOT NULL DEFAULT 'pending',
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate engagements: one proof type per user per boost
  UNIQUE (boost_id, engager_id, proof_type)
);

CREATE INDEX IF NOT EXISTS idx_engagement_proofs_boost_id ON engagement_proofs(boost_id);
CREATE INDEX IF NOT EXISTS idx_engagement_proofs_engager_id ON engagement_proofs(engager_id);

-- =============================================================================
-- points_escrow: Locked points for active boosts
-- =============================================================================
CREATE TABLE IF NOT EXISTS points_escrow (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id    UUID NOT NULL REFERENCES boost_requests(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  status      escrow_status NOT NULL DEFAULT 'held',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_points_escrow_boost_id ON points_escrow(boost_id);
CREATE INDEX IF NOT EXISTS idx_points_escrow_user_id ON points_escrow(user_id);
CREATE INDEX IF NOT EXISTS idx_points_escrow_status ON points_escrow(status) WHERE status = 'held';

-- =============================================================================
-- Trigger: Block self-engagement (engager cannot be the boost creator)
-- =============================================================================
CREATE OR REPLACE FUNCTION prevent_self_engagement()
RETURNS TRIGGER AS $$
DECLARE
  boost_owner_id UUID;
BEGIN
  SELECT user_id INTO boost_owner_id
  FROM boost_requests
  WHERE id = NEW.boost_id;

  IF NEW.engager_id = boost_owner_id THEN
    RAISE EXCEPTION 'Self-engagement is not allowed: engager cannot be the boost creator';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_self_engagement ON engagement_proofs;
CREATE TRIGGER trg_prevent_self_engagement
  BEFORE INSERT ON engagement_proofs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_engagement();

-- =============================================================================
-- Trigger: Auto-update updated_at on boost_requests
-- =============================================================================
CREATE OR REPLACE FUNCTION update_boost_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_boost_requests_updated_at ON boost_requests;
CREATE TRIGGER trg_boost_requests_updated_at
  BEFORE UPDATE ON boost_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_boost_requests_updated_at();

-- =============================================================================
-- Trigger: Sync current_engagements count on engagement_proofs insert/delete
-- =============================================================================
CREATE OR REPLACE FUNCTION sync_boost_engagement_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'verified' THEN
    UPDATE boost_requests
    SET current_engagements = current_engagements + 1
    WHERE id = NEW.boost_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'verified' AND NEW.status = 'verified' THEN
    UPDATE boost_requests
    SET current_engagements = current_engagements + 1
    WHERE id = NEW.boost_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'verified' THEN
    UPDATE boost_requests
    SET current_engagements = current_engagements - 1
    WHERE id = OLD.boost_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_boost_engagement_count ON engagement_proofs;
CREATE TRIGGER trg_sync_boost_engagement_count
  AFTER INSERT OR UPDATE OR DELETE ON engagement_proofs
  FOR EACH ROW
  EXECUTE FUNCTION sync_boost_engagement_count();

-- =============================================================================
-- RLS Policies
-- =============================================================================
ALTER TABLE boost_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_escrow ENABLE ROW LEVEL SECURITY;

-- boost_requests: anyone can read active boosts; only owner can manage
CREATE POLICY "Anyone can read active boost requests"
  ON boost_requests FOR SELECT
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create own boost requests"
  ON boost_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access boost_requests"
  ON boost_requests FOR ALL
  USING (auth.role() = 'service_role');

-- engagement_proofs: anyone can read; engager can create own
CREATE POLICY "Anyone can read engagement proofs"
  ON engagement_proofs FOR SELECT
  USING (true);

CREATE POLICY "Users can create own engagement proofs"
  ON engagement_proofs FOR INSERT
  WITH CHECK (engager_id = auth.uid());

CREATE POLICY "Service role full access engagement_proofs"
  ON engagement_proofs FOR ALL
  USING (auth.role() = 'service_role');

-- points_escrow: only owner can read own; service role manages
CREATE POLICY "Users can read own escrow"
  ON points_escrow FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access points_escrow"
  ON points_escrow FOR ALL
  USING (auth.role() = 'service_role');
