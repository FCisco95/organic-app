-- Dashboard schema: sprint AI summary columns + testimonials table
-- Migration: 20260428000000_dashboard_schema.sql

-- ─── Sprint AI Summary Columns ───────────────────────────────────────────────

ALTER TABLE sprints
  ADD COLUMN IF NOT EXISTS ai_summary_text TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_themes TEXT[],
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_summary_model TEXT;

-- ─── Testimonials Table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quote TEXT NOT NULL CHECK (char_length(quote) BETWEEN 10 AND 500),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS testimonials_status_created_idx
  ON testimonials(status, created_at DESC);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved testimonials
CREATE POLICY "testimonials_select_approved"
  ON testimonials FOR SELECT
  USING (status = 'approved');

-- Authenticated members can read their own pending/rejected submissions
CREATE POLICY "testimonials_select_own"
  ON testimonials FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

-- Authenticated members can submit (status must default to pending)
CREATE POLICY "testimonials_insert_own"
  ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid() AND status = 'pending');

-- Service role handles UPDATE and DELETE (admin moderation)
-- No explicit policy needed — service_role bypasses RLS

-- ─── Rollback notes ──────────────────────────────────────────────────────────
-- To revert:
--   DROP TABLE IF EXISTS testimonials;
--   ALTER TABLE sprints
--     DROP COLUMN IF EXISTS ai_summary_text,
--     DROP COLUMN IF EXISTS ai_summary_themes,
--     DROP COLUMN IF EXISTS ai_summary_generated_at,
--     DROP COLUMN IF EXISTS ai_summary_model;
