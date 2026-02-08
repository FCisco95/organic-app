import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();
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
      .select()
      .single();

    if (error) {
      console.error('Error instantiating template:', error);
      return NextResponse.json({ error: 'Failed to create task from template' }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Template instantiate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
