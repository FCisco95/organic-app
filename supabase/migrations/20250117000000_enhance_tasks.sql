-- Add enhanced fields to tasks table
-- Priority levels: low, medium, high, critical
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority task_priority DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index on labels for faster filtering
CREATE INDEX IF NOT EXISTS idx_tasks_labels ON tasks USING GIN (labels);

-- Create index on due_date for sorting
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);

-- Create index on priority for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);

-- Add trigger to automatically set completed_at when status changes to 'done'
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_completed_at_trigger ON tasks;
CREATE TRIGGER task_completed_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();
