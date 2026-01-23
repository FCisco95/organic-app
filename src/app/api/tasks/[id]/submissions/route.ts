import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ submissions });
  } catch (error: unknown) {
    console.error('Error in submissions GET:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
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
      .select('id, task_type, is_team_task, assignee_id, status, base_points, points')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user is assigned to this task
    let isAssigned = false;
    if (task.is_team_task) {
      const { data: assignee } = await supabase
        .from('task_assignees')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .single();
      isAssigned = !!assignee;
    } else {
      isAssigned = task.assignee_id === user.id;
    }

    if (!isAssigned) {
      return NextResponse.json({ error: 'You are not assigned to this task' }, { status: 403 });
    }

    // Check if task is in progress
    if (!['in_progress', 'review'].includes(task.status)) {
      return NextResponse.json(
        { error: 'Task must be in progress to submit work' },
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

    // Verify submission type matches task type
    if (submissionData.submission_type !== task.task_type) {
      return NextResponse.json(
        { error: `This task requires a ${task.task_type} submission` },
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
      console.error('Error creating submission:', insertError);
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
    }

    // Update task status to review
    await supabase.from('tasks').update({ status: 'review' }).eq('id', taskId);

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error in submissions POST:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
