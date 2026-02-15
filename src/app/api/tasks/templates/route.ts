import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTemplateSchema } from '@/features/tasks/schemas';

const TASK_TEMPLATE_COLUMNS =
  'id, name, description, task_type, priority, base_points, labels, is_team_task, max_assignees, default_assignee_id, is_recurring, recurrence_rule, org_id, created_by, created_at, updated_at';

// GET - List all task templates
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: templates, error } = await supabase
      .from('task_templates')
      .select(TASK_TEMPLATE_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates ?? [] });
  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new task template (council/admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only council and admin can manage templates' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from('task_templates')
      .insert({
        ...parsed.data,
        created_by: user.id,
      })
      .select(TASK_TEMPLATE_COLUMNS)
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
