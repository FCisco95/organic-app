-- =============================================
-- Phase 11: Notification batching + voting reminders
-- =============================================

-- 1. Add reminder event types
DO $$
BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'voting_reminder_24h';
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'voting_reminder_1h';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Batch tables
CREATE TABLE IF NOT EXISTS notification_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type activity_event_type NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  category notification_category NOT NULL,
  count INT NOT NULL DEFAULT 1,
  first_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_batches_active
  ON notification_batches(user_id, event_type, subject_type, subject_id, last_event_at DESC);

CREATE TABLE IF NOT EXISTS notification_batch_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES notification_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type activity_event_type NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  actor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Notifications additions
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES notification_batches(id) ON DELETE SET NULL;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe
  ON notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 4. RLS for batch tables
ALTER TABLE notification_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_batch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification batches"
  ON notification_batches FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notification batch events"
  ON notification_batch_events FOR SELECT USING (auth.uid() = user_id);

-- 5. Update notification category mapping
CREATE OR REPLACE FUNCTION get_notification_category(evt activity_event_type)
RETURNS notification_category AS $$
BEGIN
  CASE evt
    WHEN 'task_created', 'task_status_changed', 'task_completed', 'task_deleted',
         'submission_created', 'submission_reviewed' THEN
      RETURN 'tasks';
    WHEN 'proposal_created', 'proposal_status_changed', 'proposal_deleted' THEN
      RETURN 'proposals';
    WHEN 'vote_cast', 'voting_reminder_24h', 'voting_reminder_1h' THEN
      RETURN 'voting';
    WHEN 'comment_created', 'comment_deleted' THEN
      RETURN 'comments';
    ELSE
      RETURN 'system';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Replace fan-out trigger with batching for high-volume events
CREATE OR REPLACE FUNCTION notify_followers() RETURNS TRIGGER AS $$
DECLARE
  v_target_type TEXT;
  v_target_id UUID;
  v_category notification_category;
  v_window_start TIMESTAMPTZ := now() - interval '15 minutes';
  v_batch_id UUID;
  v_follower RECORD;
BEGIN
  -- Resolve the follow target (task or proposal)
  SELECT ft.target_type, ft.target_id INTO v_target_type, v_target_id
  FROM resolve_follow_target(NEW.subject_type, NEW.subject_id, NEW.metadata) ft;

  IF v_target_type IS NULL OR v_target_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_category := get_notification_category(NEW.event_type);

  -- Batch comments and submissions
  IF NEW.event_type IN ('comment_created', 'submission_created') THEN
    FOR v_follower IN
      SELECT uf.user_id
      FROM user_follows uf
      LEFT JOIN notification_preferences np
        ON np.user_id = uf.user_id AND np.category = v_category
      WHERE uf.subject_type = v_target_type
        AND uf.subject_id = v_target_id
        AND uf.user_id IS DISTINCT FROM NEW.actor_id
        AND COALESCE(np.in_app, true) = true
    LOOP
      SELECT id INTO v_batch_id
      FROM notification_batches
      WHERE user_id = v_follower.user_id
        AND event_type = NEW.event_type
        AND subject_type = v_target_type
        AND subject_id = v_target_id
        AND last_event_at >= v_window_start
      ORDER BY last_event_at DESC
      LIMIT 1;

      IF v_batch_id IS NULL THEN
        INSERT INTO notification_batches (
          user_id,
          event_type,
          subject_type,
          subject_id,
          category,
          count,
          first_event_at,
          last_event_at,
          created_at,
          updated_at
        ) VALUES (
          v_follower.user_id,
          NEW.event_type,
          v_target_type,
          v_target_id,
          v_category,
          1,
          now(),
          now(),
          now(),
          now()
        ) RETURNING id INTO v_batch_id;

        INSERT INTO notifications (
          user_id,
          event_type,
          category,
          actor_id,
          subject_type,
          subject_id,
          metadata,
          batch_id
        ) VALUES (
          v_follower.user_id,
          NEW.event_type,
          v_category,
          NEW.actor_id,
          v_target_type,
          v_target_id,
          NEW.metadata,
          v_batch_id
        );
      ELSE
        UPDATE notification_batches
        SET count = count + 1,
            last_event_at = now(),
            updated_at = now()
        WHERE id = v_batch_id;

        UPDATE notifications
        SET created_at = now(),
            read = false,
            read_at = NULL
        WHERE batch_id = v_batch_id;
      END IF;

      INSERT INTO notification_batch_events (
        batch_id,
        user_id,
        event_type,
        subject_type,
        subject_id,
        actor_id,
        metadata
      ) VALUES (
        v_batch_id,
        v_follower.user_id,
        NEW.event_type,
        v_target_type,
        v_target_id,
        NEW.actor_id,
        NEW.metadata
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- Default fan-out: one notification per follower
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
