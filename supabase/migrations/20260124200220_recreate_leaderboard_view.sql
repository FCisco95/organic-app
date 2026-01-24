-- Recreate leaderboard view to ensure ranks are available
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

GRANT SELECT ON leaderboard_view TO authenticated;
