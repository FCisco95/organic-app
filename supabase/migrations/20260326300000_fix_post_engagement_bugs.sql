-- ============================================================================
-- Fix: Post engagement bugs — duplicate points + count triggers
-- ============================================================================

-- ─── Bug 1: Add deduplication index to points_ledger ─────────────────────
-- Prevents duplicate point awards when a user toggles like off/on.
-- Matches the pattern used by xp_events (idx_xp_events_dedupe).

-- First, remove any existing duplicate rows (keep the earliest entry)
DELETE FROM points_ledger a
  USING points_ledger b
  WHERE a.source_id IS NOT NULL
    AND a.source_type IS NOT NULL
    AND a.user_id = b.user_id
    AND a.source_type = b.source_type
    AND a.source_id = b.source_id
    AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_dedupe
  ON points_ledger (user_id, source_type, source_id)
  WHERE source_id IS NOT NULL AND source_type IS NOT NULL;

-- ─── Bug 2: Recreate count triggers with SECURITY DEFINER ───────────────
-- The original triggers may fail silently if RLS blocks the UPDATE on posts.
-- SECURITY DEFINER ensures the trigger runs with the function owner's
-- privileges, bypassing RLS.

-- Likes count
DROP TRIGGER IF EXISTS tr_post_likes_count ON post_likes;
DROP FUNCTION IF EXISTS sync_post_likes_count();

CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_post_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_likes_count();

-- Comments count (comments table with subject_type = 'post')
DROP TRIGGER IF EXISTS tr_post_comments_count ON comments;
DROP FUNCTION IF EXISTS sync_post_comments_count();

CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.subject_type = 'post' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.subject_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.subject_type = 'post' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.subject_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_post_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_comments_count();

-- ─── Backfill current counts ─────────────────────────────────────────────
-- Correct any counts that drifted while triggers were not working.

UPDATE posts p SET likes_count = (
  SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id
);

UPDATE posts p SET comments_count = (
  SELECT COUNT(*) FROM comments c WHERE c.subject_type = 'post' AND c.subject_id = p.id
);
