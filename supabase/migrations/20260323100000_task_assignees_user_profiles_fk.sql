-- Add direct FK from task_assignees.user_id to user_profiles.id
-- so PostgREST can resolve the relationship for nested select joins.
--
-- The original FK (task_assignees → auth.users) remains intact for
-- referential integrity. This new FK gives PostgREST a direct path
-- to user_profiles (same pattern as task_submissions_user_id_profile_fkey).

ALTER TABLE task_assignees
  ADD CONSTRAINT task_assignees_user_id_profile_fkey
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Reload PostgREST schema cache so the new FK is immediately available.
NOTIFY pgrst, 'reload schema';
