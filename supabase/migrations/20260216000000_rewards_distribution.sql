-- ===========================================================================
-- Migration: Rewards & Distribution (Phase 15)
-- Purpose: Claimable points, reward claims, reward distributions, and admin
--          reporting/distribution RPCs.
-- ===========================================================================

-- ─── 1. Schema changes ──────────────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS claimable_points INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sprints
  ADD COLUMN IF NOT EXISTS reward_pool NUMERIC(20,9) DEFAULT 0;

ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS rewards_config JSONB DEFAULT '{
    "enabled": false,
    "points_to_token_rate": 100,
    "min_claim_threshold": 500,
    "default_epoch_pool": 0,
    "claim_requires_wallet": true
  }'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'reward_claim_status'
  ) THEN
    CREATE TYPE reward_claim_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'distribution_type'
  ) THEN
    CREATE TYPE distribution_type AS ENUM ('epoch', 'manual', 'claim');
  END IF;
END $$;

-- ─── 2. reward_claims ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_claims (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_amount     INTEGER NOT NULL CHECK (points_amount > 0),
  token_amount      NUMERIC(20,9) NOT NULL CHECK (token_amount >= 0),
  conversion_rate   NUMERIC(12,6) NOT NULL CHECK (conversion_rate > 0),
  status            reward_claim_status NOT NULL DEFAULT 'pending',
  wallet_address    TEXT,
  admin_note        TEXT,
  reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  paid_tx_signature TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_user_status
  ON reward_claims (user_id, status);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status_created
  ON reward_claims (status, created_at);

ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reward claims" ON reward_claims;
CREATE POLICY "Users can view own reward claims"
  ON reward_claims FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and council can view all reward claims" ON reward_claims;
CREATE POLICY "Admins and council can view all reward claims"
  ON reward_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Users can create own reward claims" ON reward_claims;
CREATE POLICY "Users can create own reward claims"
  ON reward_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update reward claims" ON reward_claims;
CREATE POLICY "Admins can update reward claims"
  ON reward_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ─── 3. reward_distributions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_distributions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          distribution_type NOT NULL,
  sprint_id     UUID REFERENCES sprints(id) ON DELETE SET NULL,
  claim_id      UUID REFERENCES reward_claims(id) ON DELETE SET NULL,
  points_earned INTEGER,
  token_amount  NUMERIC(20,9) NOT NULL CHECK (token_amount >= 0),
  category      TEXT,
  reason        TEXT,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_distributions_user_created
  ON reward_distributions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_distributions_sprint
  ON reward_distributions (sprint_id);
CREATE INDEX IF NOT EXISTS idx_reward_distributions_type_created
  ON reward_distributions (type, created_at DESC);

ALTER TABLE reward_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reward distributions" ON reward_distributions;
CREATE POLICY "Users can view own reward distributions"
  ON reward_distributions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and council can view all reward distributions" ON reward_distributions;
CREATE POLICY "Admins and council can view all reward distributions"
  ON reward_distributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Admins can create reward distributions" ON reward_distributions;
CREATE POLICY "Admins can create reward distributions"
  ON reward_distributions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ─── 4. Update points trigger to include claimable_points ──────────────────
CREATE OR REPLACE FUNCTION update_user_points_on_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Task transitioned to done: award points and make them claimable
  IF NEW.status = 'done'
     AND (OLD.status IS NULL OR OLD.status <> 'done')
     AND NEW.assignee_id IS NOT NULL THEN
    UPDATE user_profiles
    SET
      total_points = total_points + COALESCE(NEW.points, 0),
      claimable_points = claimable_points + COALESCE(NEW.points, 0),
      tasks_completed = tasks_completed + 1
    WHERE id = NEW.assignee_id;
  END IF;

  -- Task transitioned away from done: rollback points and claimable points
  IF OLD.status = 'done'
     AND NEW.status <> 'done'
     AND OLD.assignee_id IS NOT NULL THEN
    UPDATE user_profiles
    SET
      total_points = GREATEST(0, total_points - COALESCE(NEW.points, 0)),
      claimable_points = GREATEST(0, claimable_points - COALESCE(NEW.points, 0)),
      tasks_completed = GREATEST(0, tasks_completed - 1)
    WHERE id = OLD.assignee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_points ON tasks;
CREATE TRIGGER trigger_update_user_points
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_on_task_completion();

-- ─── 5. Epoch distribution RPC ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.distribute_epoch_rewards(UUID);

CREATE OR REPLACE FUNCTION distribute_epoch_rewards(p_sprint_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_pool NUMERIC(20,9);
  v_total_points INTEGER;
  v_existing_count INTEGER;
  v_created_count INTEGER;
BEGIN
  SELECT reward_pool
  INTO v_reward_pool
  FROM sprints
  WHERE id = p_sprint_id;

  IF v_reward_pool IS NULL OR v_reward_pool <= 0 THEN
    RETURN 0;
  END IF;

  -- Idempotency guard
  SELECT COUNT(*)::INTEGER
  INTO v_existing_count
  FROM reward_distributions
  WHERE sprint_id = p_sprint_id
    AND type = 'epoch';

  IF v_existing_count > 0 THEN
    RETURN v_existing_count;
  END IF;

  -- Prefer snapshot points from completion time
  SELECT completed_points
  INTO v_total_points
  FROM sprint_snapshots
  WHERE sprint_id = p_sprint_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF COALESCE(v_total_points, 0) <= 0 THEN
    SELECT COALESCE(SUM(COALESCE(points, 0)), 0)::INTEGER
    INTO v_total_points
    FROM tasks
    WHERE sprint_id = p_sprint_id
      AND status = 'done';
  END IF;

  IF v_total_points <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO reward_distributions (
    user_id,
    type,
    sprint_id,
    points_earned,
    token_amount,
    category,
    reason,
    created_by
  )
  SELECT
    t.assignee_id,
    'epoch'::distribution_type,
    p_sprint_id,
    SUM(COALESCE(t.points, 0))::INTEGER AS points_earned,
    ROUND(
      (SUM(COALESCE(t.points, 0))::NUMERIC / v_total_points::NUMERIC) * v_reward_pool,
      9
    ) AS token_amount,
    'epoch_reward',
    'Automated epoch reward distribution',
    NULL
  FROM tasks t
  WHERE t.sprint_id = p_sprint_id
    AND t.status = 'done'
    AND t.assignee_id IS NOT NULL
  GROUP BY t.assignee_id
  HAVING SUM(COALESCE(t.points, 0)) > 0;

  GET DIAGNOSTICS v_created_count = ROW_COUNT;
  RETURN COALESCE(v_created_count, 0);
END;
$$;

-- ─── 6. Rewards summary RPC ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_rewards_summary();

CREATE OR REPLACE FUNCTION get_rewards_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_distributed NUMERIC(20,9);
  v_pending_claims_count INTEGER;
  v_pending_claims_tokens NUMERIC(20,9);
  v_approved_claims_count INTEGER;
  v_approved_claims_tokens NUMERIC(20,9);
  v_distributions_by_type JSONB;
  v_distributions_by_month JSONB;
BEGIN
  SELECT COALESCE(SUM(token_amount), 0)
  INTO v_total_distributed
  FROM reward_distributions;

  SELECT COUNT(*)::INTEGER, COALESCE(SUM(token_amount), 0)
  INTO v_pending_claims_count, v_pending_claims_tokens
  FROM reward_claims
  WHERE status = 'pending';

  SELECT COUNT(*)::INTEGER, COALESCE(SUM(token_amount), 0)
  INTO v_approved_claims_count, v_approved_claims_tokens
  FROM reward_claims
  WHERE status = 'approved';

  SELECT COALESCE(
    jsonb_object_agg(t.type, t.total_tokens),
    '{}'::jsonb
  )
  INTO v_distributions_by_type
  FROM (
    SELECT
      type::TEXT AS type,
      ROUND(COALESCE(SUM(token_amount), 0), 9) AS total_tokens
    FROM reward_distributions
    GROUP BY type
  ) t;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'month', TO_CHAR(m.month_start, 'YYYY-MM'),
        'total', COALESCE(d.total_tokens, 0)
      )
      ORDER BY m.month_start
    ),
    '[]'::jsonb
  )
  INTO v_distributions_by_month
  FROM (
    SELECT generate_series(
      date_trunc('month', now()) - INTERVAL '5 months',
      date_trunc('month', now()),
      INTERVAL '1 month'
    )::DATE AS month_start
  ) m
  LEFT JOIN (
    SELECT
      date_trunc('month', created_at)::DATE AS month_start,
      ROUND(COALESCE(SUM(token_amount), 0), 9) AS total_tokens
    FROM reward_distributions
    WHERE created_at >= date_trunc('month', now()) - INTERVAL '5 months'
    GROUP BY 1
  ) d ON d.month_start = m.month_start;

  RETURN jsonb_build_object(
    'total_distributed', v_total_distributed,
    'pending_claims_count', v_pending_claims_count,
    'pending_claims_tokens', v_pending_claims_tokens,
    'approved_claims_count', v_approved_claims_count,
    'approved_claims_tokens', v_approved_claims_tokens,
    'distributions_by_type', v_distributions_by_type,
    'distributions_by_month', v_distributions_by_month
  );
END;
$$;

-- ─── 7. Backfill ───────────────────────────────────────────────────────────
UPDATE user_profiles
SET claimable_points = COALESCE(total_points, 0);

-- ─── 8. Leaderboard view includes claimable points ─────────────────────────
DROP VIEW IF EXISTS leaderboard_view;
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  id,
  name,
  email,
  organic_id,
  avatar_url,
  total_points,
  claimable_points,
  tasks_completed,
  role,
  xp_total,
  level,
  current_streak,
  RANK() OVER (ORDER BY total_points DESC) AS rank,
  DENSE_RANK() OVER (ORDER BY total_points DESC) AS dense_rank
FROM user_profiles
WHERE organic_id IS NOT NULL
ORDER BY total_points DESC;

GRANT SELECT ON leaderboard_view TO authenticated;
GRANT SELECT ON leaderboard_view TO anon;
