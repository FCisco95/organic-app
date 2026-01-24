import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const developmentSubmissionSchema = z.object({
  submission_type: z.literal('development'),
  pr_link: z.string().url(),
  description: z.string().max(2000).optional(),
  testing_notes: z.string().max(2000).optional(),
});

const contentSubmissionSchemaBase = z.object({
  submission_type: z.literal('content'),
  content_link: z.string().url().optional().nullable(),
  content_text: z.string().max(10000).optional().nullable(),
  description: z.string().max(2000).optional(),
  reach_metrics: z
    .object({
      views: z.number().int().min(0).optional(),
      likes: z.number().int().min(0).optional(),
      shares: z.number().int().min(0).optional(),
    })
    .optional()
    .nullable(),
});

const designSubmissionSchema = z.object({
  submission_type: z.literal('design'),
  file_urls: z.array(z.string().url()).min(1).max(20),
  description: z.string().max(2000).optional(),
  revision_notes: z.string().max(2000).optional(),
});

const customSubmissionSchema = z.object({
  submission_type: z.literal('custom'),
  description: z.string().max(2000).optional(),
  custom_fields: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .nullable(),
});

const submissionSchema = z.discriminatedUnion('submission_type', [
  developmentSubmissionSchema,
  contentSubmissionSchemaBase,
  designSubmissionSchema,
  customSubmissionSchema,
]);

// GET - Fetch submissions for a task
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check user role for viewing all submissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const canViewAll = profile?.role && ['admin', 'council'].includes(profile.role);

    let query = supabase
      .from('task_submissions')
      .select(
        `
        *,
        user:user_profiles!task_submissions_user_id_fkey(
          id, name, email, organic_id, avatar_url
        ),
        reviewer:user_profiles!task_submissions_reviewer_id_fkey(
          id, name, email, organic_id
        )
      `
      )
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false });

    // Non-admin/council can only see their own submissions or approved ones
    if (!canViewAll) {
      query = query.or(`user_id.eq.${user.id},review_status.eq.approved`);
    }

    const { data: submissions, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new submission
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, task_type, status, base_points, points, sprint_id')
      .eq('id', taskId)
      .single();

    let resolvedTask = task;
    let taskClient = supabase;

    if (taskError || !task) {
      const serviceClient = createServiceClient();
      const { data: serviceTask } = await serviceClient
        .from('tasks')
        .select('id, task_type, status, base_points, points, sprint_id')
        .eq('id', taskId)
        .single();

      if (!serviceTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      resolvedTask = serviceTask;
      taskClient = serviceClient;
    }

    if (!resolvedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organic_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to verify Organic ID' }, { status: 500 });
    }

    if (!profile?.organic_id) {
      return NextResponse.json({ error: 'Organic ID required to submit work' }, { status: 403 });
    }

    if (!resolvedTask.sprint_id) {
      return NextResponse.json(
        { error: 'Task must be in an active sprint to submit work' },
        { status: 400 }
      );
    }

    const { data: sprint, error: sprintError } = await taskClient
      .from('sprints')
      .select('status')
      .eq('id', resolvedTask.sprint_id)
      .single();

    if (sprintError) {
      return NextResponse.json({ error: 'Failed to verify sprint status' }, { status: 500 });
    }

    if (sprint?.status !== 'active') {
      return NextResponse.json(
        { error: 'Task must be in an active sprint to submit work' },
        { status: 400 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = submissionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid submission data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const submissionData = validationResult.data;

    // Additional validation for content submissions
    if (submissionData.submission_type === 'content') {
      if (!submissionData.content_link && !submissionData.content_text) {
        return NextResponse.json(
          { error: 'Either content link or content text is required' },
          { status: 400 }
        );
      }
    }

    const taskType = resolvedTask.task_type ?? 'custom';

    // Verify submission type matches task type
    if (submissionData.submission_type !== taskType) {
      return NextResponse.json(
        { error: `This task requires a ${taskType} submission` },
        { status: 400 }
      );
    }

    // Check for existing pending submission
    const { data: existingSubmission } = await supabase
      .from('task_submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .eq('review_status', 'pending')
      .single();

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You already have a pending submission for this task' },
        { status: 400 }
      );
    }

    // Create submission
    const { data: submission, error: insertError } = await supabase
      .from('task_submissions')
      .insert({
        task_id: taskId,
        user_id: user.id,
        ...submissionData,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
    }

    // Update task status to review unless already done
    if (resolvedTask.status !== 'done') {
      await supabase.from('tasks').update({ status: 'review' }).eq('id', taskId);
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
