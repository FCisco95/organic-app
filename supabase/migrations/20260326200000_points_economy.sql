-- ============================================================================
-- Phase 30: Points Economy for Posts
-- Adds organic classification, point costs, promotion, and flagging to posts.
-- ============================================================================

-- ─── New columns on posts ──────────────────────────────────────────────────

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_organic        BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_cost       INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_promoted       BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promotion_tier    TEXT           CHECK (promotion_tier IN ('spotlight', 'feature', 'mega')),
  ADD COLUMN IF NOT EXISTS promotion_points  INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promotion_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flag_count        INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organic_bonus_revoked BOOLEAN NOT NULL DEFAULT false;

-- Index for finding active promotions (feed surfacing)
CREATE INDEX IF NOT EXISTS idx_posts_promoted_active
  ON posts (promotion_expires_at DESC)
  WHERE is_promoted = true AND status = 'published';

-- Index for organic posts (tab filtering)
CREATE INDEX IF NOT EXISTS idx_posts_organic
  ON posts (is_organic, created_at DESC)
  WHERE status = 'published';

-- ─── Post flags table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_flags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE post_flags ENABLE ROW LEVEL SECURITY;

-- Users can see their own flags
CREATE POLICY "Users can view own flags"
  ON post_flags FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert flags (one per post per user enforced by unique constraint)
CREATE POLICY "Users can flag posts"
  ON post_flags FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all flags
CREATE POLICY "Admins can view all flags"
  ON post_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete flags (for restoring organic bonus)
CREATE POLICY "Admins can delete flags"
  ON post_flags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Trigger: auto-update flag_count on posts ──────────────────────────────

CREATE OR REPLACE FUNCTION sync_post_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET flag_count = (
      SELECT count(*) FROM post_flags WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;

    -- Auto-revoke organic bonus at 3 flags
    UPDATE posts
    SET organic_bonus_revoked = true
    WHERE id = NEW.post_id
      AND is_organic = true
      AND flag_count >= 3
      AND organic_bonus_revoked = false;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET flag_count = (
      SELECT count(*) FROM post_flags WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_post_flag_count
  AFTER INSERT OR DELETE ON post_flags
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_flag_count();

-- ─── Points ledger table (audit trail for point transactions) ──────────────

CREATE TABLE IF NOT EXISTS points_ledger (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount      INTEGER     NOT NULL, -- positive = credit, negative = debit
  reason      TEXT        NOT NULL,
  source_type TEXT,                 -- 'post', 'engagement', 'promotion', 'flag_penalty', 'quest'
  source_id   TEXT,                 -- reference ID
  balance_after INTEGER   NOT NULL, -- claimable_points after this transaction
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user
  ON points_ledger (user_id, created_at DESC);

-- Weekly engagement points tracking
CREATE INDEX IF NOT EXISTS idx_points_ledger_weekly_engagement
  ON points_ledger (user_id, created_at DESC)
  WHERE source_type = 'engagement';

-- Enable RLS
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

-- Users can see their own ledger
CREATE POLICY "Users can view own ledger"
  ON points_ledger FOR SELECT
  USING (user_id = auth.uid());

-- Service role inserts (via API routes using service client)
-- No INSERT policy for regular users — all inserts go through service client

-- ─── Extend activity_event_type if it's an enum ────────────────────────────
-- These are safe DO blocks — they no-op if the values already exist.

DO $$
BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'post_like_received';
EXCEPTION WHEN others THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'post_comment_received';
EXCEPTION WHEN others THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'post_promoted';
EXCEPTION WHEN others THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'post_flagged';
EXCEPTION WHEN others THEN NULL;
END$$;
