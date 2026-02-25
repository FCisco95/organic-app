-- Add direct FK constraints from task_submissions to user_profiles
-- so PostgREST can resolve the relationship without traversing auth.users.
--
-- The original FKs (task_submissions_user_id_fkey → auth.users,
-- task_submissions_reviewer_id_fkey → auth.users) remain intact for
-- referential integrity. These new FKs give PostgREST a direct path
-- to user_profiles for nested select joins.

ALTER TABLE task_submissions
  ADD CONSTRAINT task_submissions_user_id_profile_fkey
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE task_submissions
  ADD CONSTRAINT task_submissions_reviewer_id_profile_fkey
    FOREIGN KEY (reviewer_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Reload PostgREST schema cache so the new FKs are immediately available.
NOTIFY pgrst, 'reload schema';
