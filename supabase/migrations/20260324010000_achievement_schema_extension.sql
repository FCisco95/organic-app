-- ─── B1: Achievement Schema Extension (PlayStation Trophy Style) ────────
-- Adds rarity, sets, chains, progress tracking, and prerequisite gating.

-- 1. New table: achievement_sets
CREATE TABLE IF NOT EXISTS achievement_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'trophy',
  platinum_id TEXT, -- FK added after achievements ALTER
  total_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE achievement_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievement_sets_read_all"
  ON achievement_sets FOR SELECT
  TO authenticated
  USING (true);

-- 2. Extend achievements table
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'bronze'
    CHECK (rarity IN ('bronze', 'silver', 'gold', 'platinum', 'secret')),
  ADD COLUMN IF NOT EXISTS set_id TEXT REFERENCES achievement_sets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chain_id TEXT,
  ADD COLUMN IF NOT EXISTS chain_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prerequisite_achievement_id TEXT REFERENCES achievements(id) ON DELETE SET NULL;

-- Index for set lookups
CREATE INDEX IF NOT EXISTS idx_achievements_set_id ON achievements(set_id);
CREATE INDEX IF NOT EXISTS idx_achievements_chain ON achievements(chain_id, chain_order);

-- 3. New table: user_achievement_progress (enables progress bars)
CREATE TABLE IF NOT EXISTS user_achievement_progress (
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE user_achievement_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_achievement_progress_read_own"
  ON user_achievement_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_achievement_progress_read_public"
  ON user_achievement_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = user_achievement_progress.user_id
        AND profile_visible = true
    )
  );

-- 4. Add FK from achievement_sets.platinum_id to achievements
ALTER TABLE achievement_sets
  ADD CONSTRAINT fk_achievement_sets_platinum
  FOREIGN KEY (platinum_id) REFERENCES achievements(id) ON DELETE SET NULL;

-- 5. Update check_achievements() to support rarity, prerequisites, and progress
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(
  achievement_id TEXT,
  achievement_name TEXT,
  xp_reward INTEGER,
  icon TEXT
) AS $$
DECLARE
  v_achievement RECORD;
  v_current_value INTEGER;
  v_prerequisite_met BOOLEAN;
BEGIN
  FOR v_achievement IN
    SELECT a.*
    FROM achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    )
    ORDER BY a.chain_order ASC NULLS LAST
  LOOP
    -- Check prerequisite
    IF v_achievement.prerequisite_achievement_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.user_id = p_user_id
          AND ua.achievement_id = v_achievement.prerequisite_achievement_id
      ) INTO v_prerequisite_met;

      IF NOT v_prerequisite_met THEN
        CONTINUE;
      END IF;
    END IF;

    -- Skip platinum achievements (auto-awarded when set is complete)
    IF v_achievement.rarity = 'platinum' THEN
      CONTINUE;
    END IF;

    -- Resolve current value from activity counts or profiles
    SELECT COALESCE(
      CASE v_achievement.condition_field
        WHEN 'tasks_completed' THEN (SELECT uac.tasks_completed FROM user_activity_counts uac WHERE uac.user_id = p_user_id)
        WHEN 'votes_cast' THEN (SELECT uac.votes_cast FROM user_activity_counts uac WHERE uac.user_id = p_user_id)
        WHEN 'proposals_created' THEN (SELECT uac.proposals_created FROM user_activity_counts uac WHERE uac.user_id = p_user_id)
        WHEN 'comments_created' THEN (SELECT uac.comments_created FROM user_activity_counts uac WHERE uac.user_id = p_user_id)
        WHEN 'disputes_filed' THEN (SELECT uac.disputes_filed FROM user_activity_counts uac WHERE uac.user_id = p_user_id)
        WHEN 'disputes_resolved' THEN (SELECT uac.disputes_resolved FROM user_activity_counts uac WHERE uac.user_id = p_user_id)
        WHEN 'disputes_mediated' THEN (SELECT uac.disputes_mediated FROM user_activity_counts uac WHERE uac.user_id = p_user_id)
        WHEN 'disputes_won' THEN (SELECT uac.disputes_won FROM user_activity_counts uac WHERE uac.user_id = p_user_id)
        WHEN 'xp_total' THEN (SELECT up.xp_total FROM user_profiles up WHERE up.id = p_user_id)
        WHEN 'current_streak' THEN (SELECT up.current_streak FROM user_profiles up WHERE up.id = p_user_id)
        WHEN 'level' THEN (SELECT up.level FROM user_profiles up WHERE up.id = p_user_id)
        ELSE NULL
      END,
      0
    ) INTO v_current_value;

    -- Upsert progress
    INSERT INTO user_achievement_progress (user_id, achievement_id, current_value, updated_at)
    VALUES (p_user_id, v_achievement.id, v_current_value, NOW())
    ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET current_value = EXCLUDED.current_value, updated_at = NOW();

    -- Check threshold
    IF v_current_value >= v_achievement.condition_threshold THEN
      -- Unlock achievement
      INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
      VALUES (p_user_id, v_achievement.id, NOW())
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        -- Award bonus XP
        IF v_achievement.xp_reward > 0 THEN
          INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
          VALUES (p_user_id, 'achievement_unlocked', 'achievement', v_achievement.id, v_achievement.xp_reward,
            jsonb_build_object('achievement_name', v_achievement.name, 'rarity', v_achievement.rarity))
          ON CONFLICT DO NOTHING;

          IF FOUND THEN
            UPDATE user_profiles
            SET xp_total = xp_total + v_achievement.xp_reward,
                level = calculate_level_from_xp(xp_total + v_achievement.xp_reward)
            WHERE id = p_user_id;
          END IF;
        END IF;

        -- Check if set is now complete → auto-award platinum
        IF v_achievement.set_id IS NOT NULL THEN
          DECLARE
            v_set RECORD;
            v_unlocked_count INTEGER;
          BEGIN
            SELECT * INTO v_set FROM achievement_sets WHERE id = v_achievement.set_id;

            IF v_set IS NOT NULL AND v_set.platinum_id IS NOT NULL THEN
              SELECT COUNT(*) INTO v_unlocked_count
              FROM user_achievements ua
              JOIN achievements a ON a.id = ua.achievement_id
              WHERE ua.user_id = p_user_id
                AND a.set_id = v_achievement.set_id
                AND a.rarity != 'platinum';

              IF v_unlocked_count >= v_set.total_count THEN
                INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
                VALUES (p_user_id, v_set.platinum_id, NOW())
                ON CONFLICT DO NOTHING;

                IF FOUND THEN
                  DECLARE v_plat RECORD;
                  BEGIN
                    SELECT * INTO v_plat FROM achievements WHERE id = v_set.platinum_id;
                    IF v_plat.xp_reward > 0 THEN
                      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
                      VALUES (p_user_id, 'achievement_unlocked', 'achievement', v_set.platinum_id, v_plat.xp_reward,
                        jsonb_build_object('achievement_name', v_plat.name, 'rarity', 'platinum'))
                      ON CONFLICT DO NOTHING;

                      IF FOUND THEN
                        UPDATE user_profiles
                        SET xp_total = xp_total + v_plat.xp_reward,
                            level = calculate_level_from_xp(xp_total + v_plat.xp_reward)
                        WHERE id = p_user_id;
                      END IF;
                    END IF;

                    achievement_id := v_set.platinum_id;
                    achievement_name := v_plat.name;
                    xp_reward := v_plat.xp_reward;
                    icon := v_plat.icon;
                    RETURN NEXT;
                  END;
                END IF;
              END IF;
            END IF;
          END;
        END IF;

        achievement_id := v_achievement.id;
        achievement_name := v_achievement.name;
        xp_reward := v_achievement.xp_reward;
        icon := v_achievement.icon;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
