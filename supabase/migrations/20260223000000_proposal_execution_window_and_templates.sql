-- Phase 7: Proposal execution window + proposal templates
-- Adds execution tracking columns to proposals, execution_window_days to voting_config,
-- and creates the proposal_templates table with seed data.

-- 1) Add execution_window_days to voting_config
ALTER TABLE public.voting_config
ADD COLUMN IF NOT EXISTS execution_window_days INTEGER NOT NULL DEFAULT 7;

-- 2) Add execution tracking columns to proposals
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS execution_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS execution_status TEXT,
ADD COLUMN IF NOT EXISTS execution_notes TEXT,
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;

-- Constrain execution_status to known values
ALTER TABLE public.proposals
ADD CONSTRAINT proposals_execution_status_check
  CHECK (execution_status IS NULL OR execution_status IN ('pending_execution', 'executed', 'expired'));

-- Index for finding proposals pending execution (expiry sweeps)
CREATE INDEX IF NOT EXISTS idx_proposals_pending_execution
  ON public.proposals (execution_deadline)
  WHERE execution_status = 'pending_execution';

-- 3) Create proposal_templates table
CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category proposal_category NOT NULL,
  title_hint TEXT,
  summary_hint TEXT,
  motivation_template TEXT,
  solution_template TEXT,
  budget_template TEXT,
  timeline_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proposal templates are viewable by everyone"
  ON public.proposal_templates FOR SELECT
  USING (true);

CREATE POLICY "Only admins/council can manage proposal templates"
  ON public.proposal_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'council')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4) Seed default templates
INSERT INTO public.proposal_templates (name, description, category, title_hint, summary_hint, motivation_template, solution_template, budget_template, timeline_template)
VALUES
  (
    'Feature Request',
    'Propose a new feature or enhancement for the platform.',
    'feature',
    'e.g. Add dark mode support for the dashboard',
    'A brief one-line summary of the feature and its benefit.',
    E'## Problem / Motivation\n\nDescribe the problem or user need this feature addresses.\n\n- Who is affected?\n- How often does this come up?\n- What is the current workaround (if any)?',
    E'## Proposed Solution\n\nDescribe your proposed solution in detail.\n\n- What changes are needed?\n- How does this improve the user experience?\n- Are there alternative approaches you considered?',
    NULL,
    E'## Timeline\n\nEstimated phases:\n1. Design & review — 1 week\n2. Implementation — 2 weeks\n3. Testing & QA — 1 week'
  ),
  (
    'Treasury Spending',
    'Request funds from the DAO treasury for a specific purpose.',
    'treasury',
    'e.g. Fund community event sponsorship Q2 2026',
    'A brief summary of the spending request and expected outcome.',
    E'## Problem / Motivation\n\nWhy is this spending necessary?\n\n- What goal does it serve?\n- What happens if we do not fund this?',
    E'## Proposed Solution\n\nHow will the funds be used?\n\n- Breakdown of spending categories\n- Expected deliverables or outcomes',
    E'## Budget / Resources\n\n| Item | Amount | Notes |\n|------|--------|-------|\n| Example item | 1,000 ORG | Description |\n| **Total** | **1,000 ORG** | |',
    E'## Timeline\n\n- Funds disbursement: within 7 days of approval\n- Milestone check-in: 30 days after disbursement\n- Final report: 60 days after disbursement'
  ),
  (
    'Governance Change',
    'Propose a change to DAO governance rules, parameters, or processes.',
    'governance',
    'e.g. Increase quorum requirement from 5% to 10%',
    'A brief summary of the governance parameter or process change.',
    E'## Problem / Motivation\n\nWhat governance issue does this address?\n\n- What is the current rule/parameter?\n- Why is a change needed?\n- What risks exist with the current approach?',
    E'## Proposed Solution\n\nDescribe the exact governance change.\n\n- Current value → proposed value (if a parameter change)\n- New process description (if a process change)\n- How does this improve governance quality?',
    NULL,
    E'## Timeline\n\n- Effective date: immediately upon approval\n- Review period: 90 days after implementation\n- Revert criteria: if participation drops below current levels'
  );

-- 5) Function to expire pending-execution proposals past their deadline
-- Called best-effort alongside the existing override expiry sweep.
CREATE OR REPLACE FUNCTION public.expire_pending_executions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.proposals
  SET execution_status = 'expired',
      updated_at = now()
  WHERE execution_status = 'pending_execution'
    AND execution_deadline < now();
$$;

REVOKE ALL ON FUNCTION public.expire_pending_executions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_pending_executions() TO authenticated;
