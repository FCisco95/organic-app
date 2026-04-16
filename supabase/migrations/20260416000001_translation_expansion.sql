-- Translation expansion (Spec A follow-up):
--   1. Extend content_translations with provider_chars_used + tenant_id
--      columns to support SaaS analytics (Spec B admin dashboard feeds on
--      these; tenant_id becomes hot when multi-tenant lands in Spec D).
--   2. Add detected_language to proposals, ideas, comments, and task_comments
--      so translate buttons can show/hide based on content language.

-- ─── 1. content_translations accounting columns ──────────────────────────
ALTER TABLE content_translations
  ADD COLUMN IF NOT EXISTS provider_chars_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Partial index: tenant_id is null for single-tenant rows, set when
-- onboarding other projects. Only index populated values.
CREATE INDEX IF NOT EXISTS idx_translations_tenant
  ON content_translations (tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ─── 2. detected_language on translatable content ───────────────────────
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS detected_language TEXT;

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS detected_language TEXT;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS detected_language TEXT;

ALTER TABLE task_comments
  ADD COLUMN IF NOT EXISTS detected_language TEXT;

-- Partial indexes: only index rows with detection run.
CREATE INDEX IF NOT EXISTS idx_proposals_detected_language
  ON proposals (detected_language)
  WHERE detected_language IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_detected_language
  ON ideas (detected_language)
  WHERE detected_language IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_detected_language
  ON comments (detected_language)
  WHERE detected_language IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_comments_detected_language
  ON task_comments (detected_language)
  WHERE detected_language IS NOT NULL;
