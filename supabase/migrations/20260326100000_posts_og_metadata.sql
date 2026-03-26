ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS og_title TEXT,
  ADD COLUMN IF NOT EXISTS og_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;

COMMENT ON COLUMN posts.twitter_url IS 'Required link URL for non-announcement posts. Originally twitter_url, now serves as the general link field.';
COMMENT ON COLUMN posts.og_title IS 'Open Graph title fetched from the link URL at post creation time.';
COMMENT ON COLUMN posts.og_description IS 'Open Graph description fetched from the link URL at post creation time.';
COMMENT ON COLUMN posts.og_image_url IS 'Open Graph image URL fetched from the link URL at post creation time.';
