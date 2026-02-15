-- Aggregate vote totals/counts in SQL to avoid fetching every vote row in API handlers.
CREATE OR REPLACE FUNCTION get_proposal_vote_tally(p_proposal_id UUID)
RETURNS TABLE (
  yes_votes NUMERIC,
  no_votes NUMERIC,
  abstain_votes NUMERIC,
  total_votes NUMERIC,
  yes_count BIGINT,
  no_count BIGINT,
  abstain_count BIGINT,
  total_count BIGINT
) AS $$
  SELECT
    COALESCE(SUM(v.weight) FILTER (WHERE v.value = 'yes'), 0)::NUMERIC AS yes_votes,
    COALESCE(SUM(v.weight) FILTER (WHERE v.value = 'no'), 0)::NUMERIC AS no_votes,
    COALESCE(SUM(v.weight) FILTER (WHERE v.value = 'abstain'), 0)::NUMERIC AS abstain_votes,
    COALESCE(SUM(v.weight), 0)::NUMERIC AS total_votes,
    COUNT(*) FILTER (WHERE v.value = 'yes')::BIGINT AS yes_count,
    COUNT(*) FILTER (WHERE v.value = 'no')::BIGINT AS no_count,
    COUNT(*) FILTER (WHERE v.value = 'abstain')::BIGINT AS abstain_count,
    COUNT(*)::BIGINT AS total_count
  FROM votes v
  WHERE v.proposal_id = p_proposal_id;
$$ LANGUAGE sql STABLE;
