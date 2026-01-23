-- Task likes (favorites)
CREATE TABLE IF NOT EXISTS task_likes (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_likes_task_id ON task_likes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_likes_user_id ON task_likes(user_id);

ALTER TABLE task_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task likes are viewable by everyone" ON task_likes;
CREATE POLICY "Task likes are viewable by everyone"
  ON task_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members can like tasks" ON task_likes;
CREATE POLICY "Members can like tasks"
  ON task_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('member', 'council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can remove own likes" ON task_likes;
CREATE POLICY "Users can remove own likes"
  ON task_likes FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT ON task_likes TO anon;
GRANT ALL ON task_likes TO authenticated;
