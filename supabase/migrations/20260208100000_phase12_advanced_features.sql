-- Phase 12: Advanced Features Migration
-- Task Dependencies, Subtasks, Task Templates, Recurring Tasks, Vote Delegation

-- ============================================
-- 1. TASK DEPENDENCIES
-- ============================================

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Prevent self-dependency
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  -- Unique pair
  CONSTRAINT unique_dependency UNIQUE (task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- Enable RLS
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view dependencies
CREATE POLICY "Dependencies are viewable by authenticated users"
  ON task_dependencies FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Council/admin can manage dependencies
CREATE POLICY "Council and admin can manage dependencies"
  ON task_dependencies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'council')
    )
  );

-- Task creator can manage dependencies on their tasks
CREATE POLICY "Task creator can manage dependencies"
  ON task_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_dependencies.task_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Task creator can remove dependencies"
  ON task_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_dependencies.task_id AND created_by = auth.uid()
    )
  );

-- Cycle prevention function
CREATE OR REPLACE FUNCTION prevent_dependency_cycle()
RETURNS TRIGGER AS $$
BEGIN
  -- Use recursive CTE to check if adding this dependency would create a cycle
  IF EXISTS (
    WITH RECURSIVE dep_chain AS (
      -- Start from the task we depend on
      SELECT depends_on_task_id AS task_id, 1 AS depth
      FROM task_dependencies
      WHERE task_id = NEW.depends_on_task_id
      UNION ALL
      -- Follow the dependency chain
      SELECT td.depends_on_task_id, dc.depth + 1
      FROM task_dependencies td
      JOIN dep_chain dc ON td.task_id = dc.task_id
      WHERE dc.depth < 50 -- Safety limit
    )
    SELECT 1 FROM dep_chain WHERE task_id = NEW.task_id
  ) THEN
    RAISE EXCEPTION 'Adding this dependency would create a circular dependency chain';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_dependency_cycle
  BEFORE INSERT ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION prevent_dependency_cycle();


-- ============================================
-- 2. SUBTASKS (parent_task_id on tasks)
-- ============================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Prevent nesting beyond 1 level
CREATE OR REPLACE FUNCTION prevent_deep_nesting()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_task_id IS NOT NULL THEN
    -- Check if the parent itself has a parent (would make this level 2+)
    IF EXISTS (
      SELECT 1 FROM tasks WHERE id = NEW.parent_task_id AND parent_task_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Subtasks cannot be nested more than one level deep';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_subtask_nesting
  BEFORE INSERT OR UPDATE OF parent_task_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_deep_nesting();


-- ============================================
-- 3. TASK TEMPLATES
-- ============================================

-- Recurrence rule type
CREATE TYPE recurrence_rule AS ENUM (
  'sprint_start',
  'daily',
  'weekly',
  'biweekly',
  'monthly'
);

CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  task_type task_type DEFAULT 'custom',
  priority task_priority DEFAULT 'medium',
  base_points INTEGER DEFAULT 0,
  labels TEXT[] DEFAULT '{}',
  is_team_task BOOLEAN DEFAULT FALSE,
  max_assignees INTEGER DEFAULT 1,
  default_assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Recurrence config
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule recurrence_rule,

  -- Metadata
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_templates_org ON task_templates(org_id);
CREATE INDEX idx_task_templates_recurring ON task_templates(is_recurring) WHERE is_recurring = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view templates
CREATE POLICY "Templates are viewable by authenticated users"
  ON task_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Council/admin can manage templates
CREATE POLICY "Council and admin can manage templates"
  ON task_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'council')
    )
  );

-- Add template_id to tasks for tracking template origin
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL;


-- ============================================
-- 4. RECURRING TASK INSTANCES (deduplication)
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate generation per template+sprint
  CONSTRAINT unique_template_sprint UNIQUE (template_id, sprint_id)
);

CREATE INDEX idx_recurring_instances_template ON recurring_task_instances(template_id);
CREATE INDEX idx_recurring_instances_sprint ON recurring_task_instances(sprint_id);

-- Enable RLS
ALTER TABLE recurring_task_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recurring instances viewable by authenticated users"
  ON recurring_task_instances FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Council and admin can manage recurring instances"
  ON recurring_task_instances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'council')
    )
  );


-- ============================================
-- 5. VOTE DELEGATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS vote_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- NULL category = global delegation; specific category = scoped
  category proposal_category,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cannot delegate to self
  CONSTRAINT no_self_delegation CHECK (delegator_id != delegate_id)
);

-- Partial unique indexes for "one delegation per delegator per category (or one global)"
-- Non-NULL category: one delegation per delegator per specific category
CREATE UNIQUE INDEX idx_unique_delegation_category
  ON vote_delegations (delegator_id, category) WHERE category IS NOT NULL;

-- NULL category (global): one global delegation per delegator
CREATE UNIQUE INDEX idx_unique_delegation_global
  ON vote_delegations (delegator_id) WHERE category IS NULL;

CREATE INDEX idx_vote_delegations_delegator ON vote_delegations(delegator_id);
CREATE INDEX idx_vote_delegations_delegate ON vote_delegations(delegate_id);
CREATE INDEX idx_vote_delegations_category ON vote_delegations(category) WHERE category IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_vote_delegations_updated_at
  BEFORE UPDATE ON vote_delegations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE vote_delegations ENABLE ROW LEVEL SECURITY;

-- Users can view all delegations (transparency)
CREATE POLICY "Delegations are viewable by authenticated users"
  ON vote_delegations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can manage their own delegations
CREATE POLICY "Users can create their own delegations"
  ON vote_delegations FOR INSERT
  WITH CHECK (auth.uid() = delegator_id);

CREATE POLICY "Users can update their own delegations"
  ON vote_delegations FOR UPDATE
  USING (auth.uid() = delegator_id);

CREATE POLICY "Users can revoke their own delegations"
  ON vote_delegations FOR DELETE
  USING (auth.uid() = delegator_id);


-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Get all blocking dependencies for a task (tasks that must complete first)
CREATE OR REPLACE FUNCTION get_blocking_tasks(p_task_id UUID)
RETURNS TABLE (
  blocking_task_id UUID,
  blocking_task_title TEXT,
  blocking_task_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.status::TEXT
  FROM task_dependencies td
  JOIN tasks t ON t.id = td.depends_on_task_id
  WHERE td.task_id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all tasks blocked by a given task
CREATE OR REPLACE FUNCTION get_blocked_tasks(p_task_id UUID)
RETURNS TABLE (
  blocked_task_id UUID,
  blocked_task_title TEXT,
  blocked_task_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.status::TEXT
  FROM task_dependencies td
  JOIN tasks t ON t.id = td.task_id
  WHERE td.depends_on_task_id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if a task is blocked (has incomplete dependencies)
CREATE OR REPLACE FUNCTION is_task_blocked(p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM task_dependencies td
    JOIN tasks t ON t.id = td.depends_on_task_id
    WHERE td.task_id = p_task_id
      AND t.status != 'done'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get subtask progress for a parent task
CREATE OR REPLACE FUNCTION get_subtask_progress(p_parent_task_id UUID)
RETURNS TABLE (
  total_subtasks INTEGER,
  completed_subtasks INTEGER,
  progress_percentage INTEGER
) AS $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_total
  FROM tasks WHERE parent_task_id = p_parent_task_id;

  SELECT COUNT(*)::INTEGER INTO v_completed
  FROM tasks WHERE parent_task_id = p_parent_task_id AND status = 'done';

  RETURN QUERY SELECT
    v_total,
    v_completed,
    CASE WHEN v_total > 0 THEN (v_completed * 100 / v_total)::INTEGER ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get effective voting power (own + delegated) for a proposal
CREATE OR REPLACE FUNCTION get_effective_voting_power(
  p_user_id UUID,
  p_proposal_id UUID,
  p_proposal_category proposal_category DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_own_weight NUMERIC := 0;
  v_delegated_weight NUMERIC := 0;
  v_user_wallet TEXT;
BEGIN
  -- Get user's own voting weight from snapshot
  SELECT up.wallet_pubkey INTO v_user_wallet
  FROM user_profiles up WHERE up.id = p_user_id;

  IF v_user_wallet IS NOT NULL THEN
    SELECT COALESCE(hs.balance_ui, 0) INTO v_own_weight
    FROM holder_snapshots hs
    WHERE hs.proposal_id = p_proposal_id AND hs.wallet_pubkey = v_user_wallet;
  END IF;

  -- Get delegated weight from people who delegated to this user
  -- Only count delegators who haven't voted directly
  SELECT COALESCE(SUM(hs.balance_ui), 0) INTO v_delegated_weight
  FROM vote_delegations vd
  JOIN user_profiles up ON up.id = vd.delegator_id
  JOIN holder_snapshots hs ON hs.proposal_id = p_proposal_id AND hs.wallet_pubkey = up.wallet_pubkey
  WHERE vd.delegate_id = p_user_id
    -- Match global delegation OR category-specific delegation
    AND (vd.category IS NULL OR vd.category = p_proposal_category)
    -- Exclude delegators who voted directly (their vote overrides delegation)
    AND NOT EXISTS (
      SELECT 1 FROM votes v
      WHERE v.proposal_id = p_proposal_id AND v.voter_id = vd.delegator_id
    );

  RETURN v_own_weight + v_delegated_weight;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clone recurring templates into a sprint
CREATE OR REPLACE FUNCTION clone_recurring_templates(p_sprint_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_template RECORD;
  v_new_task_id UUID;
BEGIN
  FOR v_template IN
    SELECT * FROM task_templates
    WHERE is_recurring = TRUE
      AND recurrence_rule = 'sprint_start'
      -- Skip if already generated for this sprint
      AND NOT EXISTS (
        SELECT 1 FROM recurring_task_instances
        WHERE template_id = task_templates.id AND sprint_id = p_sprint_id
      )
  LOOP
    -- Create task from template
    INSERT INTO tasks (
      title, description, task_type, priority, base_points, points,
      labels, is_team_task, max_assignees, assignee_id,
      sprint_id, template_id, status, created_by
    ) VALUES (
      v_template.name,
      v_template.description,
      v_template.task_type,
      v_template.priority,
      v_template.base_points,
      v_template.base_points,
      v_template.labels,
      v_template.is_team_task,
      v_template.max_assignees,
      v_template.default_assignee_id,
      p_sprint_id,
      v_template.id,
      'backlog',
      v_template.created_by
    )
    RETURNING id INTO v_new_task_id;

    -- Record the instance for deduplication
    INSERT INTO recurring_task_instances (template_id, task_id, sprint_id)
    VALUES (v_template.id, v_new_task_id, p_sprint_id);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
