-- Proposals Revamp: structured sections, categories, and DELETE policies
-- Adds structured proposal fields so every proposal requires detail

-- 1. Create proposal_category enum
CREATE TYPE proposal_category AS ENUM (
  'feature',
  'governance',
  'treasury',
  'community',
  'development'
);

-- 2. Add structured section columns to proposals
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS category proposal_category,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS motivation TEXT,
ADD COLUMN IF NOT EXISTS solution TEXT,
ADD COLUMN IF NOT EXISTS budget TEXT,
ADD COLUMN IF NOT EXISTS timeline TEXT;

-- 3. Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_proposals_category
  ON proposals(category) WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_status_category_created
  ON proposals(status, category, created_at DESC);

-- 4. Add DELETE RLS policies (missing from initial schema)
CREATE POLICY "Authors can delete own draft proposals"
  ON proposals FOR DELETE
  USING (auth.uid() = created_by AND status = 'draft');

CREATE POLICY "Admins can delete any proposal"
  ON proposals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'council')
    )
  );

-- 5. Column comments
COMMENT ON COLUMN proposals.category IS 'Proposal category: feature, governance, treasury, community, development';
COMMENT ON COLUMN proposals.summary IS 'Short summary (50-300 chars)';
COMMENT ON COLUMN proposals.motivation IS 'Problem statement / motivation (min 100 chars)';
COMMENT ON COLUMN proposals.solution IS 'Proposed solution (min 100 chars)';
COMMENT ON COLUMN proposals.budget IS 'Optional: budget and resources needed';
COMMENT ON COLUMN proposals.timeline IS 'Optional: implementation timeline';
