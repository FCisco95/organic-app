-- Postgres best practices migration: advisory locks, BRIN indexes,
-- covering indexes, autovacuum tuning, pg_stat_statements,
-- statement timeout, and sprint completion consolidation.

-- ═══════════════════════════════════════════════════════════════════════
-- 0. Statement timeout for the anon and authenticated roles
--    Prevents runaway queries from holding connections indefinitely.
--    30s is generous for web requests; RPCs that need more can SET LOCAL.
-- ═══════════════════════════════════════════════════════════════════════

alter role authenticated set statement_timeout = '30s';
alter role anon set statement_timeout = '30s';

-- ═══════════════════════════════════════════════════════════════════════
-- 1. BRIN indexes for time-series / append-only tables
--    10-100x smaller than B-tree, ideal for monotonically increasing
--    created_at columns on large tables.
-- ═══════════════════════════════════════════════════════════════════════

create index if not exists idx_activity_log_created_at_brin
  on activity_log using brin (created_at);

create index if not exists idx_xp_events_created_at_brin
  on xp_events using brin (created_at);

create index if not exists idx_points_ledger_created_at_brin
  on points_ledger using brin (created_at);

do $$ begin
  if exists (select 1 from pg_class where relname = 'engagement_metrics_daily') then
    create index if not exists idx_engagement_metrics_daily_date_brin
      on engagement_metrics_daily using brin (date);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Covering indexes (INCLUDE) for high-traffic queries
--    Avoids heap fetches by including frequently selected columns.
-- ═══════════════════════════════════════════════════════════════════════

-- Notifications: user_id lookup returns created_at, event_type, read for list display
create index if not exists idx_notifications_user_covering
  on notifications (user_id, created_at desc)
  include (event_type, read);

-- Leaderboard: organic_id filter + sort columns included
create index if not exists idx_user_profiles_leaderboard_covering
  on user_profiles (organic_id)
  include (xp_total, total_points, tasks_completed, level)
  where organic_id is not null;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Advisory lock helper for marketplace operations
--    Prevents race conditions in multi-step boost/escrow flows.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function marketplace_create_boost(
  p_user_id uuid,
  p_tweet_url text,
  p_points_offered integer,
  p_max_engagements integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_profile record;
  v_active_count integer;
  v_boost_id uuid;
  v_lock_key bigint;
begin
  -- Derive a stable lock key from the user_id
  v_lock_key := ('x' || left(replace(p_user_id::text, '-', ''), 15))::bit(60)::bigint;

  -- Acquire transaction-scoped advisory lock (released on commit/rollback)
  perform pg_advisory_xact_lock(v_lock_key);

  -- Check user level + balance
  select level, claimable_points into v_profile
    from user_profiles
    where id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Profile not found');
  end if;

  if coalesce(v_profile.level, 1) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Level 2+ required to create boosts');
  end if;

  if coalesce(v_profile.claimable_points, 0) < p_points_offered then
    return jsonb_build_object('ok', false, 'error', 'Insufficient points');
  end if;

  -- Check active boost limit
  select count(*) into v_active_count
    from boost_requests
    where user_id = p_user_id and status = 'active';

  if v_active_count >= 3 then
    return jsonb_build_object('ok', false, 'error', 'Maximum 3 active boosts allowed');
  end if;

  -- Deduct points atomically
  update user_profiles
    set claimable_points = claimable_points - p_points_offered
    where id = p_user_id;

  -- Create boost
  insert into boost_requests (user_id, tweet_url, points_offered, max_engagements, status)
    values (p_user_id, p_tweet_url, p_points_offered, p_max_engagements, 'active')
    returning id into v_boost_id;

  -- Create escrow
  insert into points_escrow (boost_id, user_id, amount, status)
    values (v_boost_id, p_user_id, p_points_offered, 'held');

  return jsonb_build_object('ok', true, 'id', v_boost_id);
end;
$$;

create or replace function marketplace_cancel_boost(
  p_user_id uuid,
  p_boost_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_boost record;
  v_current_points integer;
  v_lock_key bigint;
begin
  v_lock_key := ('x' || left(replace(p_user_id::text, '-', ''), 15))::bit(60)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  select id, user_id, status, points_offered into v_boost
    from boost_requests
    where id = p_boost_id;

  if not found or v_boost.user_id != p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Boost not found or unauthorized');
  end if;

  if v_boost.status not in ('active', 'pending') then
    return jsonb_build_object('ok', false, 'error', 'Cannot cancel this boost');
  end if;

  -- Cancel boost
  update boost_requests set status = 'cancelled' where id = p_boost_id;

  -- Refund escrow
  update points_escrow
    set status = 'refunded', released_at = now()
    where boost_id = p_boost_id and status = 'held';

  -- Refund points
  update user_profiles
    set claimable_points = claimable_points + v_boost.points_offered
    where id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Sprint completion consolidation RPC
--    Combines post-settlement actions into single atomic call.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function finalize_sprint_completion(
  p_sprint_id uuid,
  p_target_sprint_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_escalated integer := 0;
  v_cloned integer := 0;
begin
  -- Auto-escalate unresolved disputes
  begin
    perform auto_escalate_sprint_disputes(p_sprint_id);
    get diagnostics v_escalated = row_count;
  exception when others then
    -- Non-fatal: log but continue
    raise warning 'auto_escalate_sprint_disputes failed for sprint %: %', p_sprint_id, sqlerrm;
  end;

  -- Clone recurring templates into next sprint
  if p_target_sprint_id is not null then
    begin
      perform clone_recurring_templates(p_target_sprint_id);
      get diagnostics v_cloned = row_count;
    exception when others then
      raise warning 'clone_recurring_templates failed for sprint %: %', p_target_sprint_id, sqlerrm;
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'sprint_id', p_sprint_id,
    'disputes_escalated', v_escalated,
    'templates_cloned', v_cloned
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Enable pg_stat_statements for query analysis
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pg_stat_statements;

-- ═══════════════════════════════════════════════════════════════════════
-- 6. Autovacuum tuning for high-churn tables
--    These tables get heavy INSERT/UPDATE traffic and benefit from
--    more aggressive vacuum schedules to keep statistics fresh.
-- ═══════════════════════════════════════════════════════════════════════

alter table activity_log set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

alter table xp_events set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

alter table notifications set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

alter table points_ledger set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

do $$ begin
  if exists (select 1 from pg_class where relname = 'engagement_metrics_daily') then
    alter table engagement_metrics_daily set (
      autovacuum_vacuum_scale_factor = 0.1,
      autovacuum_analyze_scale_factor = 0.05
    );
  end if;
end $$;
