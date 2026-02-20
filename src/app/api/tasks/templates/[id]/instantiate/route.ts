import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const TASK_TEMPLATE_INSTANTIATE_COLUMNS =
  'id, name, description, task_type, priority, base_points, labels, is_team_task, max_assignees, default_assignee_id';
const TASK_INSERT_COLUMNS =
  'id, title, description, task_type, priority, base_points, points, labels, is_team_task, max_assignees, assignee_id, sprint_id, template_id, status, created_by, created_at, updated_at, due_date, proposal_id, proposal_version_id, parent_task_id, claimed_at, completed_at';

const instantiateSchema = z.object({
  sprint_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
});

// POST - Create a task from a template
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: templateId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check organic_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organic_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organic_id) {
      return NextResponse.json(
        { error: 'You need an Organic ID to create tasks from templates' },
        { status: 403 }
      );
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select(TASK_TEMPLATE_INSTANTIATE_COLUMNS)
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.task_type === 'twitter') {
      return NextResponse.json(
        { error: 'Twitter/X templates are not supported yet. Create this task manually.' },
        { status: 400 }
      );
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parsed = instantiateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title: parsed.data.title || template.name,
        description: parsed.data.description || template.description,
        task_type: template.task_type,
        priority: template.priority,
        base_points: template.base_points,
        points: template.base_points,
        labels: template.labels,
        is_team_task: template.is_team_task,
        max_assignees: template.max_assignees,
        assignee_id: template.default_assignee_id,
        sprint_id: parsed.data.sprint_id || null,
        template_id: template.id,
        status: 'backlog',
        created_by: user.id,
      })
      .select(TASK_INSERT_COLUMNS)
      .single();

    if (error) {
      logger.error('Error instantiating template:', error);
      return NextResponse.json({ error: 'Failed to create task from template' }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    logger.error('Template instantiate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
