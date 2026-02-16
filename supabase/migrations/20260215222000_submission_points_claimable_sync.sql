-- ===========================================================================
-- Migration: Submission points + claimable points synchronization
-- Purpose:
--   1) Make task submission approval the single source of truth for
--      total_points / claimable_points / tasks_completed.
--   2) Prevent double-counting when API routes also touch user_profiles.
-- ===========================================================================

CREATE OR REPLACE FUNCTION update_user_points_on_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_old_points INTEGER := COALESCE(OLD.earned_points, 0);
  v_new_points INTEGER := COALESCE(NEW.earned_points, 0);
  v_delta      INTEGER := COALESCE(NEW.earned_points, 0) - COALESCE(OLD.earned_points, 0);
BEGIN
  -- Transition into approved: grant points/claimable and increment completion counter.
  IF NEW.review_status = 'approved' AND OLD.review_status IS DISTINCT FROM 'approved' THEN
    UPDATE user_profiles
    SET
      total_points = GREATEST(0, COALESCE(total_points, 0) + v_new_points),
      claimable_points = GREATEST(0, COALESCE(claimable_points, 0) + v_new_points),
      tasks_completed = COALESCE(tasks_completed, 0) + 1
    WHERE id = NEW.user_id;

    RETURN NEW;
  END IF;

  -- Approved score change (for example compromise adjustments): apply only delta.
  IF NEW.review_status = 'approved'
     AND OLD.review_status = 'approved'
     AND v_delta != 0 THEN
    UPDATE user_profiles
    SET
      total_points = GREATEST(0, COALESCE(total_points, 0) + v_delta),
      claimable_points = GREATEST(0, COALESCE(claimable_points, 0) + v_delta)
    WHERE id = NEW.user_id;

    RETURN NEW;
  END IF;

  -- Transition away from approved: rollback points/claimable and completion counter.
  IF OLD.review_status = 'approved' AND NEW.review_status IS DISTINCT FROM 'approved' THEN
    UPDATE user_profiles
    SET
      total_points = GREATEST(0, COALESCE(total_points, 0) - v_old_points),
      claimable_points = GREATEST(0, COALESCE(claimable_points, 0) - v_old_points),
      tasks_completed = GREATEST(0, COALESCE(tasks_completed, 0) - 1)
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
