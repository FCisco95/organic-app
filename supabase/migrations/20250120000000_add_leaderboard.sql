-- Add points tracking to user profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS tasks_completed INTEGER DEFAULT 0 NOT NULL;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_points ON user_profiles(total_points DESC);

-- Function to update user points when task is completed
CREATE OR REPLACE FUNCTION update_user_points_on_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if task status changed to 'done' and wasn't 'done' before
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    -- Update user's total points and tasks completed count
    UPDATE user_profiles
    SET
      total_points = total_points + COALESCE(NEW.points, 0),
      tasks_completed = tasks_completed + 1
    WHERE id = NEW.assignee_id;
  END IF;

  -- If task status changed from 'done' to something else, subtract points
  IF OLD.status = 'done' AND NEW.status != 'done' THEN
    UPDATE user_profiles
    SET
      total_points = GREATEST(0, total_points - COALESCE(NEW.points, 0)),
      tasks_completed = GREATEST(0, tasks_completed - 1)
    WHERE id = NEW.assignee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic point updates
DROP TRIGGER IF EXISTS trigger_update_user_points ON tasks;
CREATE TRIGGER trigger_update_user_points
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_on_task_completion();

-- Create view for leaderboard with ranking
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  id,
  name,
  email,
  organic_id,
  avatar_url,
  total_points,
  tasks_completed,
  role,
  RANK() OVER (ORDER BY total_points DESC) as rank,
  DENSE_RANK() OVER (ORDER BY total_points DESC) as dense_rank
FROM user_profiles
WHERE organic_id IS NOT NULL
ORDER BY total_points DESC;

-- Grant access to the view
GRANT SELECT ON leaderboard_view TO authenticated;
