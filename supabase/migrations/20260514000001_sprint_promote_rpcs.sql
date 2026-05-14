-- 20260514000001_sprint_promote_rpcs.sql
-- Sprint task D1: RPCs for promoting top backlog candidates into a sprint.

-- 1) suggest_promote_n — clamp(ceil(active_voters/5), 3, 15)
CREATE OR REPLACE FUNCTION public.suggest_promote_n(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  SELECT COUNT(DISTINCT bv.user_id)
    INTO active_count
    FROM public.backlog_votes bv
    JOIN public.tasks t ON t.id = bv.task_id
   WHERE bv.created_at > now() - interval '30 days'
     AND (p_org_id IS NULL OR t.org_id = p_org_id);

  RETURN LEAST(15, GREATEST(3, CEIL(COALESCE(active_count, 0) / 5.0)::int));
END;
$$;

-- 2) get_top_backlog_candidates — returns ranked top-N
CREATE OR REPLACE FUNCTION public.get_top_backlog_candidates(p_org_id uuid, p_limit integer)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  points integer,
  upvotes integer,
  downvotes integer,
  score integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.title,
    t.description,
    COALESCE(t.base_points, t.points) AS points,
    t.upvotes,
    t.downvotes,
    (t.upvotes - t.downvotes) AS score
  FROM public.tasks t
  WHERE t.status = 'backlog'
    AND t.sprint_id IS NULL
    AND (p_org_id IS NULL OR t.org_id = p_org_id)
  ORDER BY (t.upvotes - t.downvotes) DESC, t.created_at ASC
  LIMIT GREATEST(p_limit, 0);
$$;

-- 3) promote_top_backlog_to_sprint — idempotent: only touches backlog rows
CREATE OR REPLACE FUNCTION public.promote_top_backlog_to_sprint(p_sprint_id uuid, p_n integer)
RETURNS TABLE (promoted_task_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_sprint_status sprint_status;
BEGIN
  SELECT s.org_id, s.status INTO v_org_id, v_sprint_status
    FROM public.sprints s
   WHERE s.id = p_sprint_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sprint % not found', p_sprint_id;
  END IF;
  IF v_sprint_status <> 'planning' THEN
    RAISE EXCEPTION 'Sprint % is not in planning status (got %)', p_sprint_id, v_sprint_status;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT t.id
      FROM public.tasks t
     WHERE t.status = 'backlog'
       AND t.sprint_id IS NULL
       AND t.org_id = v_org_id
     ORDER BY (t.upvotes - t.downvotes) DESC, t.created_at ASC
     LIMIT GREATEST(p_n, 0)
  ),
  promoted AS (
    UPDATE public.tasks t
       SET sprint_id = p_sprint_id,
           status = 'todo',
           updated_at = now()
      FROM ranked
     WHERE t.id = ranked.id
    RETURNING t.id
  )
  SELECT p.id FROM promoted p;
END;
$$;

-- 4) Grants
GRANT EXECUTE ON FUNCTION public.suggest_promote_n(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_backlog_candidates(uuid, integer) TO authenticated, service_role;
-- promote restricted: only service_role (API guards with admin/council before calling).
GRANT EXECUTE ON FUNCTION public.promote_top_backlog_to_sprint(uuid, integer) TO service_role;
