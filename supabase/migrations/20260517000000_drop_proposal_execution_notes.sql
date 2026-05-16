-- Drop the deprecated proposals.execution_notes column.
--
-- Background: 20260516000000_proposal_execution_events.sql replaced this
-- column with the admin-only proposal_execution_events table, backfilled
-- existing data, and revoked anon column-level SELECT. All app code
-- (src/app/api/proposals/[id]/execute/route.ts) already writes to
-- proposal_execution_events; nothing reads execution_notes any more.
--
-- Full audit context:
--   - docs/audits/2026-05-16-rls-using-true-audit.md
--   - docs/audits/2026-05-16-routes-auth-check-triage.md
--
-- The DROP itself is destructive (cannot be reversed without ADD COLUMN +
-- backfill from proposal_execution_events.notes), so the defensive block
-- below catches the one scenario the prior migration could miss: if a
-- proposal_execution_events row already existed when the prior migration
-- applied, that migration's backfill was skipped wholesale. Anything still
-- only in execution_notes is rescued into proposal_execution_events
-- immediately before the column is dropped.

DO $$
DECLARE
    orphaned_count INT;
BEGIN
    SELECT count(*) INTO orphaned_count
    FROM public.proposals p
    WHERE p.execution_notes IS NOT NULL
      AND p.execution_notes <> ''
      AND NOT EXISTS (
          SELECT 1
          FROM public.proposal_execution_events e
          WHERE e.proposal_id = p.id
            AND e.notes = p.execution_notes
      );

    IF orphaned_count > 0 THEN
        RAISE NOTICE
            'Rescuing % proposals.execution_notes value(s) into proposal_execution_events before drop.',
            orphaned_count;

        INSERT INTO public.proposal_execution_events
            (proposal_id, actor_id, event_type, notes, created_at)
        SELECT
            p.id,
            NULL,
            CASE
                WHEN p.execution_status = 'executed' THEN 'executed'
                WHEN p.execution_status = 'expired'  THEN 'expired'
                ELSE 'note'
            END,
            p.execution_notes,
            COALESCE(p.executed_at, p.updated_at, NOW())
        FROM public.proposals p
        WHERE p.execution_notes IS NOT NULL
          AND p.execution_notes <> ''
          AND NOT EXISTS (
              SELECT 1
              FROM public.proposal_execution_events e
              WHERE e.proposal_id = p.id
                AND e.notes = p.execution_notes
          );
    END IF;
END $$;

ALTER TABLE public.proposals DROP COLUMN IF EXISTS execution_notes;
