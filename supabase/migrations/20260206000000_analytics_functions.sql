-- Analytics helper functions for dashboard aggregations
-- These are read-only aggregate functions on public data (no RLS changes needed)

-- 1. Activity trends: daily event counts grouped by category for last N days
CREATE OR REPLACE FUNCTION get_activity_trends(days INT DEFAULT 30)
RETURNS TABLE (
  day DATE,
  task_events BIGINT,
  governance_events BIGINT,
  comment_events BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.day::DATE,
    COALESCE(SUM(CASE WHEN al.event_type IN (
      'task_created', 'task_status_changed', 'task_completed', 'task_deleted',
      'submission_created', 'submission_reviewed'
    ) THEN 1 ELSE 0 END), 0) AS task_events,
    COALESCE(SUM(CASE WHEN al.event_type IN (
      'proposal_created', 'proposal_status_changed', 'proposal_deleted', 'vote_cast'
    ) THEN 1 ELSE 0 END), 0) AS governance_events,
    COALESCE(SUM(CASE WHEN al.event_type IN (
      'comment_created', 'comment_deleted'
    ) THEN 1 ELSE 0 END), 0) AS comment_events
  FROM generate_series(
    (CURRENT_DATE - (days - 1)),
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS d(day)
  LEFT JOIN activity_log al
    ON al.created_at::DATE = d.day::DATE
  GROUP BY d.day
  ORDER BY d.day ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Member growth: monthly new + cumulative member counts
CREATE OR REPLACE FUNCTION get_member_growth(months INT DEFAULT 12)
RETURNS TABLE (
  month DATE,
  new_members BIGINT,
  cumulative_members BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_new AS (
    SELECT
      DATE_TRUNC('month', up.created_at)::DATE AS m,
      COUNT(*) AS cnt
    FROM user_profiles up
    WHERE up.created_at >= DATE_TRUNC('month', CURRENT_DATE) - (months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', up.created_at)
  ),
  all_months AS (
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE) - ((months - 1) || ' months')::INTERVAL,
      DATE_TRUNC('month', CURRENT_DATE),
      '1 month'::INTERVAL
    )::DATE AS m
  )
  SELECT
    am.m AS month,
    COALESCE(mn.cnt, 0) AS new_members,
    SUM(COALESCE(mn.cnt, 0)) OVER (ORDER BY am.m) +
      (SELECT COUNT(*) FROM user_profiles WHERE created_at < DATE_TRUNC('month', CURRENT_DATE) - ((months - 1) || ' months')::INTERVAL)
      AS cumulative_members
  FROM all_months am
  LEFT JOIN monthly_new mn ON mn.m = am.m
  ORDER BY am.m ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Task completions: weekly completed task count + total points
CREATE OR REPLACE FUNCTION get_task_completions(weeks INT DEFAULT 12)
RETURNS TABLE (
  week DATE,
  completed_count BIGINT,
  total_points BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH weekly_data AS (
    SELECT
      DATE_TRUNC('week', t.completed_at)::DATE AS w,
      COUNT(*) AS cnt,
      COALESCE(SUM(t.points), 0) AS pts
    FROM tasks t
    WHERE t.status = 'done'
      AND t.completed_at IS NOT NULL
      AND t.completed_at >= DATE_TRUNC('week', CURRENT_DATE) - (weeks || ' weeks')::INTERVAL
    GROUP BY DATE_TRUNC('week', t.completed_at)
  ),
  all_weeks AS (
    SELECT generate_series(
      DATE_TRUNC('week', CURRENT_DATE) - ((weeks - 1) || ' weeks')::INTERVAL,
      DATE_TRUNC('week', CURRENT_DATE),
      '1 week'::INTERVAL
    )::DATE AS w
  )
  SELECT
    aw.w AS week,
    COALESCE(wd.cnt, 0) AS completed_count,
    COALESCE(wd.pts, 0) AS total_points
  FROM all_weeks aw
  LEFT JOIN weekly_data wd ON wd.w = aw.w
  ORDER BY aw.w ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Proposals by category: count per category
CREATE OR REPLACE FUNCTION get_proposals_by_category()
RETURNS TABLE (
  category TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.category::TEXT, 'uncategorized') AS category,
    COUNT(*) AS count
  FROM proposals p
  GROUP BY p.category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Voting participation: last N voted proposals with vote counts
CREATE OR REPLACE FUNCTION get_voting_participation(result_limit INT DEFAULT 10)
RETURNS TABLE (
  proposal_id UUID,
  proposal_title TEXT,
  vote_count BIGINT,
  yes_votes BIGINT,
  no_votes BIGINT,
  abstain_votes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS proposal_id,
    p.title AS proposal_title,
    COUNT(v.id) AS vote_count,
    SUM(CASE WHEN v.value = 'yes' THEN 1 ELSE 0 END) AS yes_votes,
    SUM(CASE WHEN v.value = 'no' THEN 1 ELSE 0 END) AS no_votes,
    SUM(CASE WHEN v.value = 'abstain' THEN 1 ELSE 0 END) AS abstain_votes
  FROM proposals p
  INNER JOIN votes v ON v.proposal_id = p.id
  GROUP BY p.id, p.title
  ORDER BY MAX(v.created_at) DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
