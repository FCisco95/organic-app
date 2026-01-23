-- Migration: Enhanced Task System for Gamified DAO
-- Adds task types, submissions, quality scoring, and team task support

-- ============================================
-- ENUMS
-- ============================================

-- Task type enum (Development, Content, Design, Custom)
CREATE TYPE task_type AS ENUM ('development', 'content', 'design', 'custom');

-- Review status enum for task submissions
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'disputed');

-- ============================================
-- ALTER TASKS TABLE
-- ============================================

-- Add new columns to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_type task_type DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS is_team_task BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_assignees INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS base_points INTEGER,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Copy existing points to base_points for existing tasks
UPDATE tasks SET base_points = points WHERE base_points IS NULL AND points IS NOT NULL;

-- ============================================
-- TASK SUBMISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Submission content (varies by task type)
  submission_type task_type NOT NULL,

  -- Development submissions
  pr_link TEXT,
  testing_notes TEXT,

  -- Content submissions
  content_link TEXT,
  content_text TEXT,
  reach_metrics JSONB, -- { views: number, likes: number, shares: number, etc }

  -- Design submissions
  file_urls TEXT[], -- Array of uploaded file URLs
  revision_notes TEXT,

  -- Common fields
  description TEXT,
  custom_fields JSONB, -- For custom task types

  -- Review fields
  review_status review_status DEFAULT 'pending',
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  rejection_reason TEXT,

  -- Points calculation
  earned_points INTEGER, -- Calculated: base_points * quality_multiplier

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_development_submission CHECK (
    submission_type != 'development' OR pr_link IS NOT NULL
  ),
  CONSTRAINT valid_content_submission CHECK (
    submission_type != 'content' OR (content_link IS NOT NULL OR content_text IS NOT NULL)
  ),
  CONSTRAINT valid_design_submission CHECK (
    submission_type != 'design' OR file_urls IS NOT NULL
  )
);

-- ============================================
-- TASK ASSIGNEES TABLE (for team tasks)
-- ============================================

CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  submission_id UUID REFERENCES task_submissions(id) ON DELETE SET NULL,

  -- Unique constraint: user can only claim a task once
  UNIQUE(task_id, user_id)
);

-- ============================================
-- QUALITY MULTIPLIER FUNCTION
-- ============================================

-- Function to calculate quality multiplier (1-5 stars → 20%-100%)
CREATE OR REPLACE FUNCTION calculate_quality_multiplier(score INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  CASE score
    WHEN 5 THEN RETURN 1.0;    -- 100%
    WHEN 4 THEN RETURN 0.8;    -- 80%
    WHEN 3 THEN RETURN 0.6;    -- 60%
    WHEN 2 THEN RETURN 0.4;    -- 40%
    WHEN 1 THEN RETURN 0.2;    -- 20%
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- TRIGGER: Calculate earned points on review
-- ============================================

CREATE OR REPLACE FUNCTION calculate_submission_points()
RETURNS TRIGGER AS $$
DECLARE
  task_base_points INTEGER;
  multiplier DECIMAL;
BEGIN
  -- Only calculate when quality_score is set and review is approved
  IF NEW.quality_score IS NOT NULL AND NEW.review_status = 'approved' THEN
    -- Get base points from task
    SELECT COALESCE(base_points, points, 0) INTO task_base_points
    FROM tasks WHERE id = NEW.task_id;

    -- Calculate multiplier
    multiplier := calculate_quality_multiplier(NEW.quality_score);

    -- Calculate earned points
    NEW.earned_points := FLOOR(task_base_points * multiplier);
    NEW.reviewed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_submission_points
  BEFORE UPDATE ON task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_submission_points();

-- ============================================
-- TRIGGER: Update user points when submission approved
-- ============================================

CREATE OR REPLACE FUNCTION update_user_points_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- When submission is approved and has earned points
  IF NEW.review_status = 'approved' AND NEW.earned_points > 0
     AND (OLD.review_status IS NULL OR OLD.review_status != 'approved') THEN
    -- Add points to user
    UPDATE user_profiles
    SET total_points = COALESCE(total_points, 0) + NEW.earned_points,
        tasks_completed = COALESCE(tasks_completed, 0) + 1
    WHERE id = NEW.user_id;
  END IF;

  -- If submission was approved but is now rejected/disputed, remove points
  IF OLD.review_status = 'approved' AND NEW.review_status != 'approved'
     AND OLD.earned_points > 0 THEN
    UPDATE user_profiles
    SET total_points = GREATEST(0, COALESCE(total_points, 0) - OLD.earned_points),
        tasks_completed = GREATEST(0, COALESCE(tasks_completed, 0) - 1)
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_points_on_submission
  AFTER UPDATE ON task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_on_submission();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_review_status ON task_submissions(review_status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_submitted_at ON task_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_is_team_task ON tasks(is_team_task);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- Task submissions policies
CREATE POLICY "Anyone can view approved submissions"
  ON task_submissions FOR SELECT
  USING (review_status = 'approved');

CREATE POLICY "Users can view their own submissions"
  ON task_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and council can view all submissions"
  ON task_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'council')
    )
  );

CREATE POLICY "Authenticated users can create submissions"
  ON task_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending submissions"
  ON task_submissions FOR UPDATE
  USING (auth.uid() = user_id AND review_status = 'pending');

CREATE POLICY "Admins and council can update any submission"
  ON task_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Task assignees policies
CREATE POLICY "Anyone can view task assignees"
  ON task_assignees FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users with organic_id can claim tasks"
  ON task_assignees FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organic_id IS NOT NULL
    )
  );

CREATE POLICY "Users can unclaim their own tasks"
  ON task_assignees FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- UPDATED AT TRIGGERS
-- ============================================

CREATE TRIGGER set_task_submissions_updated_at
  BEFORE UPDATE ON task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
