-- ============================================================================
-- C2: Community Posts System
-- Tables: posts, post_thread_parts, post_likes
-- Plus: activity_event_type extensions for post events
-- ============================================================================

-- Post type enum
DO $$ BEGIN
  CREATE TYPE post_type AS ENUM ('text', 'thread', 'announcement', 'link_share');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Post status enum
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Posts table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  post_type   post_type NOT NULL DEFAULT 'text',
  status      post_status NOT NULL DEFAULT 'published',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  twitter_url TEXT,
  boostable   BOOLEAN NOT NULL DEFAULT FALSE,
  removed_at  TIMESTAMPTZ,
  removed_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_pinned_created ON posts(is_pinned DESC, created_at DESC) WHERE status = 'published';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_posts_updated_at ON posts;
CREATE TRIGGER tr_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_updated_at();

-- ─── Post thread parts (multi-part threads) ────────────────────────────

CREATE TABLE IF NOT EXISTS post_thread_parts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  part_order INTEGER NOT NULL DEFAULT 1,
  body       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, part_order)
);

CREATE INDEX IF NOT EXISTS idx_post_thread_parts_post ON post_thread_parts(post_id, part_order);

-- ─── Post likes (toggle) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

-- ─── Likes count sync function ─────────────────────────────────────────

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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_post_likes_count ON post_likes;
CREATE TRIGGER tr_post_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_likes_count();

-- ─── Comments count sync (using existing comments table) ───────────────

CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.subject_type = 'post' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.subject_id::uuid;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.subject_type = 'post' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.subject_id::uuid;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_post_comments_count ON comments;
CREATE TRIGGER tr_post_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_comments_count();

-- ─── Extend activity_event_type enum ───────────────────────────────────

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'post_created';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'post_liked';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'post_commented';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── RLS Policies ──────────────────────────────────────────────────────

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_thread_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Posts: anyone can read published posts
CREATE POLICY "Anyone can read published posts"
  ON posts FOR SELECT
  USING (status = 'published' OR author_id = auth.uid());

-- Posts: authenticated users with organic_id can create
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Posts: authors can update their own
CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Thread parts: follow parent post access
CREATE POLICY "Anyone can read thread parts"
  ON post_thread_parts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM posts WHERE posts.id = post_thread_parts.post_id
      AND (posts.status = 'published' OR posts.author_id = auth.uid())
  ));

CREATE POLICY "Authors can manage thread parts"
  ON post_thread_parts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM posts WHERE posts.id = post_thread_parts.post_id
      AND posts.author_id = auth.uid()
  ));

-- Likes: authenticated users can manage own likes
CREATE POLICY "Anyone can read likes"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own likes"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for all tables
CREATE POLICY "Service role full access posts"
  ON posts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access thread parts"
  ON post_thread_parts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access likes"
  ON post_likes FOR ALL
  USING (auth.role() = 'service_role');
