-- ===========================================================================
-- Migration: Dispute Resolution Fixes
-- Purpose:
--   1) Allow council members to update disputes (required for self-assignment)
--   2) Make dispute XP event writes idempotent across appeal re-resolutions
-- ===========================================================================

-- ─── 1. RLS policy: council should be allowed to update disputes ───────────

DROP POLICY IF EXISTS "Parties and arbitrators can update disputes" ON disputes;

CREATE POLICY "Parties and arbitrators can update disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = disputant_id
    OR auth.uid() = reviewer_id
    OR auth.uid() = arbitrator_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'council')
    )
  );

-- ─── 2. XP trigger: avoid duplicate xp_events on appeal re-resolution ──────

CREATE OR REPLACE FUNCTION apply_dispute_xp_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_config            JSONB;
  v_reviewer_penalty  INTEGER;
  v_arbitrator_reward INTEGER;
  v_withdrawal_fee    INTEGER;
  v_refund_amount     INTEGER;
BEGIN
  -- Only process terminal status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated') THEN
    RETURN NEW;
  END IF;

  -- Load config
  SELECT gamification_config INTO v_config FROM orgs LIMIT 1;
  v_reviewer_penalty := COALESCE((v_config->>'xp_dispute_reviewer_penalty')::integer, 30);
  v_arbitrator_reward := COALESCE((v_config->>'xp_dispute_arbitrator_reward')::integer, 25);
  v_withdrawal_fee := COALESCE((v_config->>'xp_dispute_withdrawal_fee')::integer, 10);

  -- Apply XP effects based on resolution
  CASE
    WHEN NEW.status = 'resolved' AND NEW.resolution = 'overturned' THEN
      -- Refund disputant stake
      UPDATE user_profiles
      SET xp_total = xp_total + NEW.xp_stake,
          level = calculate_level_from_xp(xp_total + NEW.xp_stake)
      WHERE id = NEW.disputant_id;

      -- Penalize reviewer
      UPDATE user_profiles
      SET xp_total = GREATEST(0, xp_total - v_reviewer_penalty),
          level = calculate_level_from_xp(GREATEST(0, xp_total - v_reviewer_penalty))
      WHERE id = NEW.reviewer_id;

      -- Log XP events (idempotent)
      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES
        (NEW.disputant_id, 'dispute_resolved_for', 'dispute', NEW.id, NEW.xp_stake,
         jsonb_build_object('resolution', 'overturned', 'type', 'stake_refund')),
        (NEW.reviewer_id, 'dispute_resolved_against', 'dispute', NEW.id, -v_reviewer_penalty,
         jsonb_build_object('resolution', 'overturned', 'type', 'reviewer_penalty'))
      ON CONFLICT (user_id, event_type, source_type, source_id)
        WHERE source_id IS NOT NULL
      DO NOTHING;

      UPDATE disputes SET xp_refunded = true WHERE id = NEW.id;

    WHEN NEW.status = 'resolved' AND NEW.resolution = 'compromise' THEN
      -- Refund disputant stake (no reviewer penalty)
      UPDATE user_profiles
      SET xp_total = xp_total + NEW.xp_stake,
          level = calculate_level_from_xp(xp_total + NEW.xp_stake)
      WHERE id = NEW.disputant_id;

      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_for', 'dispute', NEW.id, NEW.xp_stake,
              jsonb_build_object('resolution', 'compromise', 'type', 'stake_refund'))
      ON CONFLICT (user_id, event_type, source_type, source_id)
        WHERE source_id IS NOT NULL
      DO NOTHING;

      UPDATE disputes SET xp_refunded = true WHERE id = NEW.id;

    WHEN NEW.status = 'resolved' AND NEW.resolution = 'upheld' THEN
      -- Disputant loses stake (already deducted on filing)
      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_against', 'dispute', NEW.id, -NEW.xp_stake,
              jsonb_build_object('resolution', 'upheld', 'type', 'stake_lost'))
      ON CONFLICT (user_id, event_type, source_type, source_id)
        WHERE source_id IS NOT NULL
      DO NOTHING;

    WHEN NEW.status = 'dismissed' THEN
      -- Disputant loses stake (already deducted on filing)
      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_against', 'dispute', NEW.id, -NEW.xp_stake,
              jsonb_build_object('resolution', 'dismissed', 'type', 'stake_lost'))
      ON CONFLICT (user_id, event_type, source_type, source_id)
        WHERE source_id IS NOT NULL
      DO NOTHING;

    WHEN NEW.status = 'withdrawn' THEN
      -- Partial refund: stake minus withdrawal fee
      v_refund_amount := GREATEST(0, NEW.xp_stake - v_withdrawal_fee);
      IF v_refund_amount > 0 THEN
        UPDATE user_profiles
        SET xp_total = xp_total + v_refund_amount,
            level = calculate_level_from_xp(xp_total + v_refund_amount)
        WHERE id = NEW.disputant_id;
      END IF;

      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_against', 'dispute', NEW.id,
              -LEAST(v_withdrawal_fee, NEW.xp_stake),
              jsonb_build_object('resolution', 'withdrawn', 'type', 'withdrawal_fee',
                                 'refunded', v_refund_amount))
      ON CONFLICT (user_id, event_type, source_type, source_id)
        WHERE source_id IS NOT NULL
      DO NOTHING;

      UPDATE disputes SET xp_refunded = true WHERE id = NEW.id;

    WHEN NEW.status = 'mediated' THEN
      -- Full refund
      UPDATE user_profiles
      SET xp_total = xp_total + NEW.xp_stake,
          level = calculate_level_from_xp(xp_total + NEW.xp_stake)
      WHERE id = NEW.disputant_id;

      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_for', 'dispute', NEW.id, NEW.xp_stake,
              jsonb_build_object('resolution', 'mediated', 'type', 'stake_refund'))
      ON CONFLICT (user_id, event_type, source_type, source_id)
        WHERE source_id IS NOT NULL
      DO NOTHING;

      UPDATE disputes SET xp_refunded = true WHERE id = NEW.id;

    ELSE
      NULL;
  END CASE;

  -- Award arbitrator XP (for all terminal statuses except withdrawn/mediated)
  IF NEW.arbitrator_id IS NOT NULL AND NEW.status IN ('resolved', 'dismissed') THEN
    UPDATE user_profiles
    SET xp_total = xp_total + v_arbitrator_reward,
        level = calculate_level_from_xp(xp_total + v_arbitrator_reward)
    WHERE id = NEW.arbitrator_id;

    INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
    VALUES (NEW.arbitrator_id, 'dispute_arbitrated', 'dispute', NEW.id, v_arbitrator_reward,
            jsonb_build_object('resolution', COALESCE(NEW.resolution::text, NEW.status::text),
                               'type', 'arbitrator_reward'))
    ON CONFLICT (user_id, event_type, source_type, source_id)
      WHERE source_id IS NOT NULL
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
