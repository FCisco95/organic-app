-- Fix self-referential RLS policy on proposal_voter_snapshots that silently
-- denied all reads from session-authenticated clients.
--
-- The original SELECT policy (from 20260329000000_rls_remaining_tables.sql)
-- referenced its own table inside the USING clause:
--
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.proposal_voter_snapshots pvs
--       WHERE pvs.proposal_id = proposal_voter_snapshots.proposal_id
--         AND pvs.voter_id = (SELECT auth.uid())
--     ) OR ...
--   )
--
-- Postgres applies the same RLS policy to the inner SELECT, so the check
-- becomes "you can see your row only if you can see your row." It collapses
-- to false for all non-service-role callers. Service role bypasses RLS,
-- which is why start_proposal_voting_integrity() (SECURITY DEFINER) wrote
-- the rows correctly but /api/proposals/[id]/vote and
-- /api/proposals/[id]/effective-power couldn't read them back.
--
-- Symptom (issue #59): voting-integrity.spec.ts saw /vote return the
-- (tampered) holder_snapshots value because proposal_voter_snapshots
-- appeared empty under the user's session.
--
-- Fix: replace the self-referential check with a direct voter_id = auth.uid()
-- comparison. The two endpoints that read this table both filter by
-- voter_id already, so no callers depend on the original "participants can
-- read all snapshots in the proposal" semantics — it was over-engineered
-- for a use case that doesn't exist in code.

DROP POLICY IF EXISTS "proposal_voter_snapshots: participants and admin/council can read"
  ON public.proposal_voter_snapshots;

CREATE POLICY "proposal_voter_snapshots: voter or admin/council can read"
  ON public.proposal_voter_snapshots
  FOR SELECT
  TO authenticated
  USING (
    voter_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );
