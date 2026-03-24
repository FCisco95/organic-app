-- ─── Phase 28: Ideas XP hooks + quest definitions ───────────────────────
-- Extends activity_event_type enum, updates gamification_config defaults,
-- and seeds idea-related quests.

-- 1. Extend activity_event_type enum with idea events
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'idea_created';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'idea_voted';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'idea_promoted_winner';

-- 2. Update gamification_config defaults with idea XP values
UPDATE orgs
SET gamification_config = gamification_config || jsonb_build_object(
  'xp_idea_created', 5,
  'xp_idea_voted', 1,
  'xp_idea_vote_received', 1,
  'xp_idea_promoted_winner', 25
)
WHERE gamification_config IS NOT NULL
  AND NOT (gamification_config ? 'xp_idea_created');

-- 3. Update award_xp() trigger to handle idea events
CREATE OR REPLACE FUNCTION award_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_xp INTEGER;
  v_config JSONB;
  v_enabled BOOLEAN;
  v_mode TEXT;
  v_new_xp INTEGER;
BEGIN
  -- Load config
  SELECT gamification_config INTO v_config FROM orgs LIMIT 1;
  v_enabled := COALESCE((v_config ->> 'enabled')::boolean, true);
  IF NOT v_enabled THEN RETURN NEW; END IF;

  v_mode := COALESCE(v_config ->> 'leveling_mode', 'auto');

  -- Calculate XP based on event type
  v_xp := CASE NEW.event_type
    WHEN 'task_completed' THEN
      GREATEST(1, COALESCE((NEW.metadata ->> 'points')::int, 1)
        * COALESCE((v_config ->> 'xp_per_task_point')::int, 10))
    WHEN 'vote_cast' THEN COALESCE((v_config ->> 'xp_vote_cast')::int, 15)
    WHEN 'proposal_created' THEN COALESCE((v_config ->> 'xp_proposal_created')::int, 50)
    WHEN 'comment_created' THEN COALESCE((v_config ->> 'xp_comment_created')::int, 5)
    WHEN 'idea_created' THEN COALESCE((v_config ->> 'xp_idea_created')::int, 5)
    WHEN 'idea_voted' THEN COALESCE((v_config ->> 'xp_idea_voted')::int, 1)
    WHEN 'idea_promoted_winner' THEN COALESCE((v_config ->> 'xp_idea_promoted_winner')::int, 25)
    ELSE 0
  END;

  IF v_xp <= 0 THEN RETURN NEW; END IF;

  -- Idempotent XP insert (dedupe index prevents duplicates)
  INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
  VALUES (
    NEW.actor_id,
    NEW.event_type::text,
    NEW.subject_type,
    NEW.subject_id,
    v_xp,
    NEW.metadata
  )
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Update user XP + level
  IF v_mode = 'auto' THEN
    UPDATE user_profiles
    SET xp_total = xp_total + v_xp,
        level = calculate_level_from_xp(xp_total + v_xp)
    WHERE id = NEW.actor_id;
  ELSE
    UPDATE user_profiles
    SET xp_total = xp_total + v_xp
    WHERE id = NEW.actor_id;
  END IF;

  -- Update streaks
  UPDATE user_profiles
  SET last_active_date = CURRENT_DATE,
      current_streak = CASE
        WHEN last_active_date = CURRENT_DATE THEN current_streak
        WHEN last_active_date = CURRENT_DATE - 1 THEN current_streak + 1
        ELSE 1
      END,
      longest_streak = GREATEST(
        longest_streak,
        CASE
          WHEN last_active_date = CURRENT_DATE THEN current_streak
          WHEN last_active_date = CURRENT_DATE - 1 THEN current_streak + 1
          ELSE 1
        END
      )
  WHERE id = NEW.actor_id;

  -- Upsert activity counts
  INSERT INTO user_activity_counts (user_id, tasks_completed, votes_cast, comments_created, proposals_created, updated_at)
  VALUES (
    NEW.actor_id,
    CASE WHEN NEW.event_type = 'task_completed' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type IN ('vote_cast', 'idea_voted') THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'comment_created' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type IN ('proposal_created', 'idea_created') THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tasks_completed = user_activity_counts.tasks_completed +
      CASE WHEN NEW.event_type = 'task_completed' THEN 1 ELSE 0 END,
    votes_cast = user_activity_counts.votes_cast +
      CASE WHEN NEW.event_type IN ('vote_cast', 'idea_voted') THEN 1 ELSE 0 END,
    comments_created = user_activity_counts.comments_created +
      CASE WHEN NEW.event_type = 'comment_created' THEN 1 ELSE 0 END,
    proposals_created = user_activity_counts.proposals_created +
      CASE WHEN NEW.event_type IN ('proposal_created', 'idea_created') THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Seed idea-related quests
INSERT INTO quests (org_id, title, description, cadence, metric_type, target_value, unit, xp_reward, points_reward, is_active, icon, sort_order) VALUES
  (NULL, 'Share an Idea', 'Submit at least 1 idea today', 'daily', 'daily_ideas_created', 1, 'ideas', 5, 2, true, 'lightbulb', 20),
  (NULL, 'Vote on Ideas', 'Vote on at least 3 ideas today', 'daily', 'daily_idea_votes_cast', 3, 'votes', 3, 1, true, 'thumbs-up', 21),
  (NULL, 'Community Voice', 'Submit 3 ideas this week', 'weekly', 'weekly_ideas_created', 3, 'ideas', 15, 5, true, 'megaphone', 20),
  (NULL, 'Idea Champion', 'Have one of your ideas promoted', 'long_term', 'long_term_ideas_promoted', 1, 'ideas', 50, 20, true, 'trophy', 20)
ON CONFLICT DO NOTHING;
