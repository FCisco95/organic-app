-- Enum for event types
CREATE TYPE activity_event_type AS ENUM (
  'task_created', 'task_status_changed', 'task_completed', 'task_deleted',
  'submission_created', 'submission_reviewed',
  'comment_created', 'comment_deleted',
  'proposal_created', 'proposal_status_changed', 'proposal_deleted',
  'vote_cast'
);

-- Activity log table
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type activity_event_type NOT NULL,
  actor_id UUID REFERENCES user_profiles(id),
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id);

-- Enable RLS, allow public read
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON activity_log FOR SELECT USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- Trigger: tasks INSERT
CREATE OR REPLACE FUNCTION activity_log_task_insert() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (
    'task_created',
    NEW.created_by,
    'task',
    NEW.id,
    jsonb_build_object('title', NEW.title, 'points', NEW.base_points, 'task_type', NEW.task_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_task_insert
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION activity_log_task_insert();

-- Trigger: tasks UPDATE (status change)
CREATE OR REPLACE FUNCTION activity_log_task_update() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'done' THEN
      INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
      VALUES (
        'task_completed',
        NEW.assignee_id,
        'task',
        NEW.id,
        jsonb_build_object('title', NEW.title, 'points', NEW.points, 'old_status', OLD.status, 'new_status', NEW.status)
      );
    ELSE
      INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
      VALUES (
        'task_status_changed',
        NEW.assignee_id,
        'task',
        NEW.id,
        jsonb_build_object('title', NEW.title, 'old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_task_update
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION activity_log_task_update();

-- Trigger: task_submissions INSERT
CREATE OR REPLACE FUNCTION activity_log_submission_insert() RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
BEGIN
  SELECT title INTO v_title FROM tasks WHERE id = NEW.task_id;
  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (
    'submission_created',
    NEW.user_id,
    'submission',
    NEW.id,
    jsonb_build_object('task_id', NEW.task_id, 'title', v_title, 'submission_type', NEW.submission_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_submission_insert
  AFTER INSERT ON task_submissions
  FOR EACH ROW EXECUTE FUNCTION activity_log_submission_insert();

-- Trigger: task_submissions UPDATE (review)
CREATE OR REPLACE FUNCTION activity_log_submission_review() RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF OLD.review_status IS DISTINCT FROM NEW.review_status AND NEW.review_status IN ('approved', 'rejected') THEN
    SELECT title INTO v_title FROM tasks WHERE id = NEW.task_id;
    INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
    VALUES (
      'submission_reviewed',
      NEW.reviewer_id,
      'submission',
      NEW.id,
      jsonb_build_object('task_id', NEW.task_id, 'title', v_title, 'review_status', NEW.review_status, 'quality_score', NEW.quality_score)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_submission_review
  AFTER UPDATE ON task_submissions
  FOR EACH ROW EXECUTE FUNCTION activity_log_submission_review();

-- Trigger: task_comments INSERT
CREATE OR REPLACE FUNCTION activity_log_comment_insert() RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
BEGIN
  SELECT title INTO v_title FROM tasks WHERE id = NEW.task_id;
  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (
    'comment_created',
    NEW.user_id,
    'comment',
    NEW.id,
    jsonb_build_object('task_id', NEW.task_id, 'title', v_title)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_comment_insert
  AFTER INSERT ON task_comments
  FOR EACH ROW EXECUTE FUNCTION activity_log_comment_insert();

-- Trigger: proposals INSERT
CREATE OR REPLACE FUNCTION activity_log_proposal_insert() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (
    'proposal_created',
    NEW.created_by,
    'proposal',
    NEW.id,
    jsonb_build_object('title', NEW.title)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_proposal_insert
  AFTER INSERT ON proposals
  FOR EACH ROW EXECUTE FUNCTION activity_log_proposal_insert();

-- Trigger: proposals UPDATE (status change)
CREATE OR REPLACE FUNCTION activity_log_proposal_update() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
    VALUES (
      'proposal_status_changed',
      NEW.created_by,
      'proposal',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_proposal_update
  AFTER UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION activity_log_proposal_update();

-- Trigger: votes INSERT
CREATE OR REPLACE FUNCTION activity_log_vote_insert() RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
BEGIN
  SELECT title INTO v_title FROM proposals WHERE id = NEW.proposal_id;
  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (
    'vote_cast',
    NEW.voter_id,
    'vote',
    NEW.id,
    jsonb_build_object('proposal_id', NEW.proposal_id, 'title', v_title, 'value', NEW.value)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_vote_insert
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION activity_log_vote_insert();

-- Trigger: tasks DELETE
CREATE OR REPLACE FUNCTION activity_log_task_delete() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (
    'task_deleted',
    OLD.assignee_id,
    'task',
    OLD.id,
    jsonb_build_object('title', OLD.title, 'points', OLD.base_points)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_task_delete
  AFTER DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION activity_log_task_delete();

-- Trigger: proposals DELETE
CREATE OR REPLACE FUNCTION activity_log_proposal_delete() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (
    'proposal_deleted',
    OLD.created_by,
    'proposal',
    OLD.id,
    jsonb_build_object('title', OLD.title)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_proposal_delete
  AFTER DELETE ON proposals
  FOR EACH ROW EXECUTE FUNCTION activity_log_proposal_delete();

-- Trigger: task_comments DELETE
CREATE OR REPLACE FUNCTION activity_log_comment_delete() RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
BEGIN
  SELECT title INTO v_title FROM tasks WHERE id = OLD.task_id;
  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (
    'comment_deleted',
    OLD.user_id,
    'comment',
    OLD.id,
    jsonb_build_object('task_id', OLD.task_id, 'title', v_title)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_activity_comment_delete
  AFTER DELETE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION activity_log_comment_delete();
