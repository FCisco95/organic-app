# Enhanced Task Management System

## Overview

The Organic DAO task system focuses on transparent execution, with a tabbed Tasks list for backlog and history and a Kanban board scoped to the active sprint only.

## Features

### 1. **Enhanced Task Creation**

Tasks can now be created with the following fields:

- **Title** (required): Clear, concise task name
- **Description** (optional): Detailed task information
- **Priority** (required, default: Medium):
  - Low: Minor improvements, nice-to-haves
  - Medium: Standard tasks
  - High: Important features or fixes
  - Critical: Urgent issues requiring immediate attention
- **Points** (optional): Story points for effort estimation (Fibonacci scale recommended: 1, 2, 3, 5, 8, 13)
- **Assignee** (optional): Select from members with Organic IDs
- **Epoch/Sprint** (optional): Assign to a time-boxed work period
- **Due Date** (optional): Set deadlines for task completion
- **Labels** (optional): Add tags for categorization (e.g., "frontend", "bug", "documentation")

### 2. **Kanban Board (Active Sprint Only)**

Five-column board for visualizing current sprint workflow:

1. **Backlog**: Unstarted, unscheduled tasks
2. **To Do**: Tasks ready to be worked on
3. **In Progress**: Active development
4. **Review**: Awaiting code review or testing
5. **Done**: Completed tasks

### 3. **Task Cards**

Task cards display rich information at a glance:

- Priority badge with color coding:
  - 🔴 Critical (red)
  - 🟠 High (orange)
  - 🟡 Medium (yellow)
  - 🟢 Low (green)
- Labels with custom tags
- Due date with overdue warnings
- Story points
- Assigned epoch/sprint
- Assignee (shown as Organic ID)

### 4. **Epoch/Sprint Management**

Organize tasks into time-boxed work periods:

- Create sprints with start and end dates
- Track sprint status: Planning, Active, or Completed
- Filter tasks by sprint

### 5. **Proposal to Task Conversion**

Council members and admins can convert approved proposals into tasks:

- Automatically copies proposal title and description
- Links task back to source proposal
- Creates task in "Backlog" status with "Medium" priority
- Redirects to task board for further configuration

## Database Schema

### New Fields Added to `tasks` Table

```sql
priority task_priority DEFAULT 'medium'  -- Enum: low, medium, high, critical
due_date TIMESTAMPTZ                      -- Optional deadline
labels TEXT[]                             -- Array of label tags
completed_at TIMESTAMPTZ                  -- Auto-set when status = 'done'
```

### Indexes

```sql
CREATE INDEX idx_tasks_labels ON tasks USING GIN (labels);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);
CREATE INDEX idx_tasks_priority ON tasks (priority);
```

### Automatic Triggers

- `completed_at` is automatically set when task status changes to 'done'
- `completed_at` is cleared if task is moved back from 'done' to another status

## API Endpoints

### GET `/api/tasks/assignees`

Fetches all members eligible to be assigned tasks (members with Organic IDs).

**Response:**

```json
{
  "assignees": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "organic_id": 42,
      "role": "member"
    }
  ]
}
```

## Permissions

### Task Creation

- Members, Council, and Admins can create tasks

### Task Updates

- Council and Admins can update any task
- Members can update tasks assigned to them

### Task Deletion

- Only Council and Admins can delete tasks

### Proposal-to-Task Conversion

- Only Council and Admins can create tasks from proposals
- Only works on "approved" proposals

## Usage Guide

### Creating a Task

1. Navigate to the Task Board (`/[locale]/tasks`, for example `/en/tasks`)
2. Click "New Task" button
3. Fill in the required and optional fields:
   - Add a clear, descriptive title
   - Optionally add detailed description
   - Select priority level
   - Assign story points for planning
   - Choose an assignee (or leave unassigned)
   - Select an epoch if applicable
   - Set a due date if needed
   - Add labels for categorization
4. Click "Create Task"

### Managing Tasks

- **Tabs**: All / Backlog / Active / In Review / Completed
- **Filters**: Search, category, contributor, sprint, date range
- **Backlog sorting**: Uses community favorites (likes) first

### Creating Tasks from Proposals

1. Navigate to an approved proposal
2. Scroll to the "Implementation" section (visible to Council/Admin)
3. Click "Create Task from Proposal"
4. The task is created and you're redirected to the task board
5. Edit the task to add assignee, due date, labels, etc.

### Creating Sprints

1. Navigate to the Task Board
2. Use the Sprints page to create a sprint
3. Enter sprint name (e.g., "Sprint 1", "Q1 2024")
4. Set start and end dates
5. Click "Create Sprint"
6. Assign tasks to the sprint when creating or editing tasks

## Best Practices

### Priority Guidelines

- **Critical**: Production bugs, security issues, blocking issues
- **High**: Key features, important improvements, high-value work
- **Medium**: Standard features, enhancements, routine work
- **Low**: Nice-to-haves, minor improvements, non-urgent tasks

### Story Points

Use Fibonacci sequence (1, 2, 3, 5, 8, 13) where:

- 1 = Trivial, < 1 hour
- 2 = Simple, < half day
- 3 = Moderate, ~1 day
- 5 = Complex, 2-3 days
- 8 = Very complex, ~1 week
- 13 = Epic, needs breakdown

### Labels

Suggested label categories:

- **Type**: `bug`, `feature`, `enhancement`, `documentation`
- **Area**: `frontend`, `backend`, `smart-contract`, `design`
- **Status**: `blocked`, `needs-review`, `in-testing`
- **Priority**: `high-priority`, `quick-win`, `technical-debt`

### Epochs

- Keep epochs 1-2 weeks long
- Don't overload epochs - plan realistic capacity
- Start with Planning status, move to Active when work begins
- Complete one epoch before starting the next
- Review completed epochs for continuous improvement

## Future Enhancements

Potential additions for the task system:

- Task comments and activity log
- Subtasks and checklists
- Time tracking and estimates vs actuals
- File attachments
- Task dependencies
- Burndown charts and velocity tracking
- Email notifications for assignments and due dates
- Task templates for common types of work
- Drag-and-drop between columns
- Advanced filtering (by assignee, labels, priority)

## Technical Implementation

### Files Modified

1. `supabase/migrations/20250117000000_enhance_tasks.sql` - Database schema
2. `src/app/api/tasks/assignees/route.ts` - API endpoint for assignees
3. `src/app/[locale]/tasks/page.tsx` - Enhanced task board with new fields
4. `src/app/[locale]/proposals/[id]/page.tsx` - Added "Create Task" button

### Key Components

- **TaskCard**: Displays task with priority, labels, due date, assignee
- **NewTaskModal**: Enhanced form with all new fields
- **TasksPage**: Main board with filtering and state management

### TypeScript Types

```typescript
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  points: number | null;
  assignee_id: string | null;
  sprint_id: string | null;
  proposal_id: string | null;
  due_date: string | null;
  labels: string[] | null;
  created_at: string;
  completed_at: string | null;
  assignee?: {
    organic_id: number | null;
    email: string;
  } | null;
  sprints?: {
    name: string;
  } | null;
};
```

## Migration Instructions

To apply the database changes:

```bash
# If using Supabase CLI
supabase db reset

# Or apply migration directly
psql -d your_database -f supabase/migrations/20250117000000_enhance_tasks.sql
```

---

**Last Updated**: January 17, 2025
**Version**: 2.0
**Maintained by**: Organic DAO Development Team
