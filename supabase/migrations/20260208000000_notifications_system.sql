-- =============================================
-- Phase 11: Notifications System
-- Tables: user_follows, notifications, notification_preferences
-- Triggers: auto-follow, fan-out from activity_log
-- =============================================

-- 1. Notification category enum
CREATE TYPE notification_category AS ENUM ('tasks', 'proposals', 'voting', 'comments', 'system');

-- 2. user_follows — who subscribes to what
CREATE TABLE user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('task', 'proposal')),
  subject_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, subject_type, subject_id)
);

CREATE INDEX idx_user_follows_user ON user_follows(user_id);
CREATE INDEX idx_user_follows_subject ON user_follows(subject_type, subject_id);

-- 3. notifications — per-user notification records
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type activity_event_type NOT NULL,
  category notification_category NOT NULL,
  actor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- 4. notification_preferences — per-user, per-category channel toggles
CREATE TABLE notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  in_app BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, category)
);

-- 5. RLS policies

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- user_follows: users manage their own
CREATE POLICY "Users can view own follows" ON user_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows" ON user_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows" ON user_follows FOR DELETE USING (auth.uid() = user_id);

-- notifications: users read/update their own (inserts come from SECURITY DEFINER trigger)
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- notification_preferences: users manage their own
CREATE POLICY "Users can view own prefs" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prefs" ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prefs" ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- 6. Enable Realtime for live notification push
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 7. Helper: map event_type → notification_category
CREATE OR REPLACE FUNCTION get_notification_category(evt activity_event_type)
RETURNS notification_category AS $$
BEGIN
  CASE evt
    WHEN 'task_created', 'task_status_changed', 'task_completed', 'task_deleted',
         'submission_created', 'submission_reviewed' THEN
      RETURN 'tasks';
    WHEN 'proposal_created', 'proposal_status_changed', 'proposal_deleted' THEN
      RETURN 'proposals';
    WHEN 'vote_cast' THEN
      RETURN 'voting';
    WHEN 'comment_created', 'comment_deleted' THEN
      RETURN 'comments';
    ELSE
      RETURN 'system';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Helper: resolve activity_log subject → follow target (task or proposal)
CREATE OR REPLACE FUNCTION resolve_follow_target(
  p_subject_type TEXT,
  p_subject_id UUID,
  p_metadata JSONB
) RETURNS TABLE(target_type TEXT, target_id UUID) AS $$
BEGIN
  CASE p_subject_type
    WHEN 'task' THEN
      RETURN QUERY SELECT 'task'::TEXT, p_subject_id;
    WHEN 'submission' THEN
      RETURN QUERY SELECT 'task'::TEXT, (p_metadata->>'task_id')::UUID;
    WHEN 'comment' THEN
      RETURN QUERY SELECT 'task'::TEXT, (p_metadata->>'task_id')::UUID;
    WHEN 'proposal' THEN
      RETURN QUERY SELECT 'proposal'::TEXT, p_subject_id;
    WHEN 'vote' THEN
      RETURN QUERY SELECT 'proposal'::TEXT, (p_metadata->>'proposal_id')::UUID;
    ELSE
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Fan-out trigger: activity_log INSERT → notifications for each follower
CREATE OR REPLACE FUNCTION notify_followers() RETURNS TRIGGER AS $$
DECLARE
  v_target_type TEXT;
  v_target_id UUID;
  v_category notification_category;
BEGIN
  -- Resolve the follow target (task or proposal)
  SELECT ft.target_type, ft.target_id INTO v_target_type, v_target_id
  FROM resolve_follow_target(NEW.subject_type, NEW.subject_id, NEW.metadata) ft;

  IF v_target_type IS NULL OR v_target_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_category := get_notification_category(NEW.event_type);

  -- Fan out: one notification per follower, skip actor, respect in_app pref
  INSERT INTO notifications (user_id, event_type, category, actor_id, subject_type, subject_id, metadata)
  SELECT
    uf.user_id,
    NEW.event_type,
    v_category,
    NEW.actor_id,
    v_target_type,
    v_target_id,
    NEW.metadata
  FROM user_follows uf
  LEFT JOIN notification_preferences np
    ON np.user_id = uf.user_id AND np.category = v_category
  WHERE uf.subject_type = v_target_type
    AND uf.subject_id = v_target_id
    AND uf.user_id IS DISTINCT FROM NEW.actor_id
    AND COALESCE(np.in_app, true) = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_followers
  AFTER INSERT ON activity_log
  FOR EACH ROW EXECUTE FUNCTION notify_followers();

-- 10. Auto-follow triggers

-- Task creator auto-follows their task
CREATE OR REPLACE FUNCTION auto_follow_task_creator() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO user_follows (user_id, subject_type, subject_id)
    VALUES (NEW.created_by, 'task', NEW.id)
    ON CONFLICT (user_id, subject_type, subject_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_follow_task_creator
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION auto_follow_task_creator();

-- Task assignee auto-follows when assigned
CREATE OR REPLACE FUNCTION auto_follow_task_assignee() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    INSERT INTO user_follows (user_id, subject_type, subject_id)
    VALUES (NEW.assignee_id, 'task', NEW.id)
    ON CONFLICT (user_id, subject_type, subject_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_follow_task_assignee
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION auto_follow_task_assignee();

-- Proposal creator auto-follows their proposal
CREATE OR REPLACE FUNCTION auto_follow_proposal_creator() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO user_follows (user_id, subject_type, subject_id)
    VALUES (NEW.created_by, 'proposal', NEW.id)
    ON CONFLICT (user_id, subject_type, subject_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_follow_proposal_creator
  AFTER INSERT ON proposals
  FOR EACH ROW EXECUTE FUNCTION auto_follow_proposal_creator();

-- Voter auto-follows the proposal they voted on
CREATE OR REPLACE FUNCTION auto_follow_voter() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_follows (user_id, subject_type, subject_id)
  VALUES (NEW.voter_id, 'proposal', NEW.proposal_id)
  ON CONFLICT (user_id, subject_type, subject_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_follow_voter
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION auto_follow_voter();

-- Commenter auto-follows the task they commented on
CREATE OR REPLACE FUNCTION auto_follow_commenter() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_follows (user_id, subject_type, subject_id)
  VALUES (NEW.user_id, 'task', NEW.task_id)
  ON CONFLICT (user_id, subject_type, subject_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_follow_commenter
  AFTER INSERT ON task_comments
  FOR EACH ROW EXECUTE FUNCTION auto_follow_commenter();
