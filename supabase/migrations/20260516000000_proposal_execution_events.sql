-- Proposal execution events: admin-only audit trail.
--
-- Replaces the world-readable proposals.execution_notes column flagged in the
-- 2026-05-16 RLS USING(true) audit (docs/audits/2026-05-16-rls-using-true-audit.md).
-- Execution context (admin/council notes, recipient wallet references, etc.)
-- now lives in a separate table with admin/council-only RLS.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Admin-only audit table for proposal execution events.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.proposal_execution_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('executed', 'expired', 'note')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_execution_events_proposal
    ON public.proposal_execution_events(proposal_id);

ALTER TABLE public.proposal_execution_events ENABLE ROW LEVEL SECURITY;

-- Only admin/council can read execution events.
DROP POLICY IF EXISTS "Admin and council can read proposal execution events"
    ON public.proposal_execution_events;
CREATE POLICY "Admin and council can read proposal execution events"
    ON public.proposal_execution_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('admin', 'council')
        )
    );

-- Only admin/council can insert execution events.
DROP POLICY IF EXISTS "Admin and council can insert proposal execution events"
    ON public.proposal_execution_events;
CREATE POLICY "Admin and council can insert proposal execution events"
    ON public.proposal_execution_events FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('admin', 'council')
        )
    );

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Backfill existing execution_notes into the new table.
--    Idempotent: only runs when proposal_execution_events is empty.
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.proposal_execution_events (proposal_id, actor_id, event_type, notes, created_at)
SELECT
    p.id,
    NULL,                              -- actor unknown for backfilled rows
    CASE
        WHEN p.execution_status = 'executed' THEN 'executed'
        WHEN p.execution_status = 'expired' THEN 'expired'
        ELSE 'note'
    END,
    p.execution_notes,
    COALESCE(p.executed_at, p.updated_at, NOW())
FROM public.proposals p
WHERE p.execution_notes IS NOT NULL
  AND p.execution_notes <> ''
  AND NOT EXISTS (SELECT 1 FROM public.proposal_execution_events);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Revoke anon column-level SELECT on proposals.execution_notes.
--    Keeps authenticated table-level SELECT intact (DAO transparency for
--    logged-in users). The dynamic block grants every CURRENT proposals
--    column to anon EXCEPT execution_notes, so we don't have to maintain
--    a hand-maintained allowlist.
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    cols TEXT;
BEGIN
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name <> 'execution_notes';

    EXECUTE 'REVOKE SELECT ON public.proposals FROM anon';
    EXECUTE format('GRANT SELECT (%s) ON public.proposals TO anon', cols);
END $$;

COMMENT ON COLUMN public.proposals.execution_notes IS
    'Deprecated 2026-05-16. New writes go to proposal_execution_events. '
    'Anon SELECT revoked at column level. Authenticated reads still allowed '
    'for backward compatibility but no live code path reads this column.';
