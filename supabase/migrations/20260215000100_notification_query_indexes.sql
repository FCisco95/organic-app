-- Optimize notification list filters used by /api/notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_category_created
  ON notifications(user_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_category_read_created
  ON notifications(user_id, category, read, created_at DESC);
