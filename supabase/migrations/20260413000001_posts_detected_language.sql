-- Add detected_language column to posts.
-- NULL means detection hasn't run yet (backfill existing posts separately).

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS detected_language TEXT;

-- Index for filtering "posts not in my language"
CREATE INDEX IF NOT EXISTS idx_posts_detected_language
  ON posts (detected_language)
  WHERE detected_language IS NOT NULL;
