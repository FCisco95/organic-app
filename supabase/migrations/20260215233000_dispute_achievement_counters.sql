-- ===========================================================================
-- Migration: Dispute achievement counters and unlock wiring
-- Purpose:
--   1) Track dispute-specific counters in user_activity_counts.
--   2) Unlock dispute achievements from real counter values.
--   3) Run achievement checks when dispute counters change.
-- ===========================================================================

-- Add dedicated counters for dispute achievements.
ALTER TABLE user_activity_counts
  ADD COLUMN IF NOT EXISTS disputes_mediated INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputes_won      INTEGER NOT NULL DEFAULT 0;

-- Ensure dispute achievements point to the intended counter fields.
INSERT INTO achievements (
  id,
  name,
  description,
  icon,
  category,
  condition_type,
  condition_field,
  condition_threshold,
  xp_reward
)
VALUES
  ('first_arbiter',  'First Arbiter',   'Resolve your first dispute as arbitrator', '⚖️', 'governance', 'counter', 'disputes_resolved', 1, 50),
  ('justice_keeper', 'Justice Keeper',  'Resolve 10 disputes as arbitrator',         '🏛️', 'governance', 'counter', 'disputes_resolved', 10, 200),
  ('peacemaker',     'Peacemaker',      'Mediate 5 disputes successfully',           '🕊️', 'community',  'counter', 'disputes_mediated', 5, 100),
  ('vindicated',     'Vindicated',      'Win your first dispute as disputant',       '✊', 'milestone',  'counter', 'disputes_won', 1, 25)
ON CONFLICT (id)
DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  condition_type = EXCLUDED.condition_type,
  condition_field = EXCLUDED.condition_field,
  condition_threshold = EXCLUDED.condition_threshold,
  xp_reward = EXCLUDED.xp_reward;

-- Extend check_achievements to evaluate dispute counters from user_activity_counts.
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_id   TEXT,
  achievement_name TEXT,
  xp_reward        INTEGER,
  icon             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_achievement RECORD;
  v_field_value INTEGER;
BEGIN
  FOR v_achievement IN
    SELECT a.*
    FROM achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = p_user_id
        AND ua.achievement_id = a.id
    )
  LOOP
    -- Get the current value for the condition field.
    IF v_achievement.condition_field IN (
      'tasks_completed',
      'votes_cast',
      'proposals_created',
      'comments_created',
      'disputes_filed',
      'disputes_resolved',
      'disputes_mediated',
      'disputes_won'
    ) THEN
      EXECUTE format(
        'SELECT COALESCE(%I, 0) FROM user_activity_counts WHERE user_id = $1',
        v_achievement.condition_field
      ) INTO v_field_value USING p_user_id;
    ELSIF v_achievement.condition_field IN ('xp_total', 'current_streak') THEN
      EXECUTE format(
        'SELECT COALESCE(%I, 0) FROM user_profiles WHERE id = $1',
        v_achievement.condition_field
      ) INTO v_field_value USING p_user_id;
    ELSE
      v_field_value := 0;
    END IF;

    -- Check if threshold is met.
    IF COALESCE(v_field_value, 0) >= v_achievement.condition_threshold THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id)
      ON CONFLICT ON CONSTRAINT user_achievements_pkey DO NOTHING;

      IF FOUND AND v_achievement.xp_reward > 0 THEN
        INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
        VALUES (
          p_user_id,
          'achievement_unlocked',
          'achievement',
          NULL,
          v_achievement.xp_reward,
          jsonb_build_object('achievement_id', v_achievement.id)
        );

        UPDATE user_profiles
        SET
          xp_total = xp_total + v_achievement.xp_reward,
          level = calculate_level_from_xp(xp_total + v_achievement.xp_reward)
        WHERE id = p_user_id;

        achievement_id := v_achievement.id;
        achievement_name := v_achievement.name;
        xp_reward := v_achievement.xp_reward;
        icon := v_achievement.icon;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- Keep dispute counters in sync and trigger achievement checks.
CREATE OR REPLACE FUNCTION update_dispute_activity_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Dispute filed counter (disputant).
    INSERT INTO user_activity_counts (user_id, disputes_filed, updated_at)
    VALUES (NEW.disputant_id, 1, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      disputes_filed = user_activity_counts.disputes_filed + 1,
      updated_at = NOW();

    PERFORM check_achievements(NEW.disputant_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Arbitrator resolutions (resolved and dismissed outcomes).
    IF NEW.status IN ('resolved', 'dismissed') AND NEW.arbitrator_id IS NOT NULL THEN
      INSERT INTO user_activity_counts (user_id, disputes_resolved, updated_at)
      VALUES (NEW.arbitrator_id, 1, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        disputes_resolved = user_activity_counts.disputes_resolved + 1,
        updated_at = NOW();

      PERFORM check_achievements(NEW.arbitrator_id);
    END IF;

    -- Successful mediation counters for both parties.
    IF NEW.status = 'mediated' THEN
      INSERT INTO user_activity_counts (user_id, disputes_mediated, updated_at)
      VALUES
        (NEW.disputant_id, 1, NOW()),
        (NEW.reviewer_id, 1, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        disputes_mediated = user_activity_counts.disputes_mediated + 1,
        updated_at = NOW();

      PERFORM check_achievements(NEW.disputant_id);
      PERFORM check_achievements(NEW.reviewer_id);
    END IF;

    -- Disputant win counters (overturned or compromise).
    IF NEW.status = 'resolved' AND NEW.resolution IN ('overturned', 'compromise') THEN
      INSERT INTO user_activity_counts (user_id, disputes_won, updated_at)
      VALUES (NEW.disputant_id, 1, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        disputes_won = user_activity_counts.disputes_won + 1,
        updated_at = NOW();

      PERFORM check_achievements(NEW.disputant_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_dispute_activity_counters ON disputes;
CREATE TRIGGER trigger_dispute_activity_counters
  AFTER INSERT OR UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_dispute_activity_counters();
