-- Generic content translation cache.
-- Supports any translatable content type (posts, comments, proposals, ideas).
-- Designed for multi-tenant: add a tenant_id column when onboarding other projects.

CREATE TABLE IF NOT EXISTS content_translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- What we translated
  content_type TEXT NOT NULL,       -- 'post', 'comment', 'proposal', 'idea'
  content_id UUID NOT NULL,         -- FK to the source content row
  field_name TEXT NOT NULL,         -- 'title', 'body', 'thread_parts'

  -- Translation details
  source_locale TEXT NOT NULL,      -- detected language of original ('en', 'pt-PT', 'zh-CN')
  target_locale TEXT NOT NULL,      -- locale of this translation ('en', 'pt-PT', 'zh-CN')
  translated_text TEXT NOT NULL,    -- the translated content

  -- Metadata
  provider TEXT NOT NULL DEFAULT 'deepl-free',  -- which service translated this
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one translation per (content, field, target locale)
  CONSTRAINT uq_translation_target
    UNIQUE (content_type, content_id, field_name, target_locale)
);

-- Fast lookups: "give me all translations for this post in this locale"
CREATE INDEX idx_translations_lookup
  ON content_translations (content_type, content_id, target_locale);

-- RLS: translations are public read (same as posts).
-- Only the service role can insert (translations created via API route).
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations"
  ON content_translations FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert translations"
  ON content_translations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can delete translations"
  ON content_translations FOR DELETE
  USING (true);
