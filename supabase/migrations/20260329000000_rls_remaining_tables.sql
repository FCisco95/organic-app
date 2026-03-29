-- ============================================================================
-- Migration: Add RLS policies to tables missing them
-- Tables: market_snapshots, reward_settlement_events, proposal_voter_snapshots
--
-- All three tables are written exclusively by service_role (which bypasses
-- RLS), so INSERT/UPDATE/DELETE policies block non-service-role clients.
-- SELECT policies are tailored to each table's sensitivity level.
-- ============================================================================

-- ============================================================================
-- 1. market_snapshots
-- Public market price cache (Jupiter/CoinGecko). Safe for any authenticated
-- user to read. Only the market-data cron/service writes to this table.
-- ============================================================================

ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read market data (it's public price information).
CREATE POLICY "market_snapshots: authenticated users can read"
  ON public.market_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- Block direct inserts from non-service-role clients.
-- Service role bypasses RLS, so the cron job and server functions are unaffected.
CREATE POLICY "market_snapshots: no direct insert"
  ON public.market_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Block direct updates from non-service-role clients.
CREATE POLICY "market_snapshots: no direct update"
  ON public.market_snapshots
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Block direct deletes from non-service-role clients.
CREATE POLICY "market_snapshots: no direct delete"
  ON public.market_snapshots
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- 2. reward_settlement_events
-- Append-only settlement audit trail. Sensitive financial data — only
-- admin/council should be able to read. Service role inserts via
-- SECURITY DEFINER functions (commit_sprint_reward_settlement).
-- ============================================================================

ALTER TABLE public.reward_settlement_events ENABLE ROW LEVEL SECURITY;

-- Only admin or council members can read settlement events (audit trail).
CREATE POLICY "reward_settlement_events: admin/council can read"
  ON public.reward_settlement_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Block direct inserts from non-service-role clients.
-- All inserts go through SECURITY DEFINER functions which run as the
-- function owner, not the calling user, and use service-level access.
CREATE POLICY "reward_settlement_events: no direct insert"
  ON public.reward_settlement_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Block direct updates (also enforced by the append-only trigger).
CREATE POLICY "reward_settlement_events: no direct update"
  ON public.reward_settlement_events
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Block direct deletes (also enforced by the append-only trigger).
CREATE POLICY "reward_settlement_events: no direct delete"
  ON public.reward_settlement_events
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- 3. proposal_voter_snapshots
-- Per-proposal voting power snapshots. Participants in a proposal (users who
-- have a snapshot row) can read all snapshots for that proposal — needed for
-- the effective-power endpoint. Admin/council can read all snapshots.
-- Service role inserts via start_proposal_voting_integrity().
-- ============================================================================

ALTER TABLE public.proposal_voter_snapshots ENABLE ROW LEVEL SECURITY;

-- Participants can read snapshots for proposals they are part of.
-- A user is a "participant" if they have their own snapshot row for the same
-- proposal. Admin/council can read all snapshots regardless.
CREATE POLICY "proposal_voter_snapshots: participants and admin/council can read"
  ON public.proposal_voter_snapshots
  FOR SELECT
  TO authenticated
  USING (
    -- The user has a snapshot in this proposal (they are a participant)
    EXISTS (
      SELECT 1 FROM public.proposal_voter_snapshots pvs
      WHERE pvs.proposal_id = proposal_voter_snapshots.proposal_id
        AND pvs.voter_id = (SELECT auth.uid())
    )
    OR
    -- Admin/council can read all snapshots
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Block direct inserts from non-service-role clients.
-- All inserts go through the start_proposal_voting_integrity() SECURITY DEFINER function.
CREATE POLICY "proposal_voter_snapshots: no direct insert"
  ON public.proposal_voter_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Block direct updates from non-service-role clients.
CREATE POLICY "proposal_voter_snapshots: no direct update"
  ON public.proposal_voter_snapshots
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Block direct deletes from non-service-role clients.
CREATE POLICY "proposal_voter_snapshots: no direct delete"
  ON public.proposal_voter_snapshots
  FOR DELETE
  TO authenticated
  USING (false);
