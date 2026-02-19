-- ===========================================================================
-- Migration: Parallel Proposal Comment Count RPC
-- Purpose:   Add get_comment_counts_for_type() so proposals and their comment
--            counts can be fetched in parallel (no sequential ID dependency).
--
-- Before: proposals fetch → extract IDs → get_comment_counts(ids) [sequential]
-- After:  proposals fetch ∥ get_comment_counts_for_type() [parallel]
--
-- The existing get_comment_counts(subject_type, ids[]) RPC remains intact for
-- other callers that already hold IDs and want a targeted fetch.
--
-- Applied: 2026-02-19 (version 20260219222832)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.get_comment_counts_for_type(p_subject_type TEXT)
RETURNS TABLE (subject_id UUID, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT c.subject_id, COUNT(*)::BIGINT AS count
  FROM public.comments c
  WHERE c.subject_type = p_subject_type
  GROUP BY c.subject_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_comment_counts_for_type(TEXT)
  TO authenticated, anon;
