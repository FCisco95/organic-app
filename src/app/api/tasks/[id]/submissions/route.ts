import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { Database } from '@/types/database';

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

const twitterSubmissionSchema = z.object({
  submission_type: z.literal('twitter'),
  screenshot_url: z.string().url().optional().nullable(),
  comment_text: z.string().max(10000).optional().nullable(),
  description: z.string().max(2000).optional(),
});

const submissionSchema = z.discriminatedUnion('submission_type', [
  developmentSubmissionSchema,
  contentSubmissionSchemaBase,
  designSubmissionSchema,
  customSubmissionSchema,
  twitterSubmissionSchema,
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

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    const twitterSubmissionIds = submissions
      .filter((submission) => submission.submission_type === 'twitter')
      .map((submission) => submission.id);

    if (twitterSubmissionIds.length === 0) {
      return NextResponse.json({ submissions });
    }

    const { data: twitterSubmissions, error: twitterSubmissionError } = await supabase
      .from('twitter_engagement_submissions')
      .select('*')
      .in('submission_id', twitterSubmissionIds);

    if (twitterSubmissionError) {
      return NextResponse.json({ error: 'Failed to fetch twitter submission details' }, { status: 500 });
    }

    const twitterSubmissionMap = new Map(
      (twitterSubmissions ?? []).map((submission) => [submission.submission_id, submission])
    );

    const enrichedSubmissions = submissions.map((submission) => ({
      ...submission,
      twitter_engagement_submission: twitterSubmissionMap.get(submission.id) ?? null,
    }));

    return NextResponse.json({ submissions: enrichedSubmissions });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new submission
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

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

    let twitterSubmissionInsert:
      | {
          twitter_account_id: string;
          engagement_type: 'like' | 'retweet' | 'comment';
          target_tweet_id: string;
          verification_method: 'api_auto' | 'screenshot' | 'manual' | 'ai_scored';
          screenshot_url: string | null;
          comment_text: string | null;
        }
      | null = null;

    let submissionInsertPayload: Record<string, unknown> = submissionData;

    if (submissionData.submission_type === 'twitter') {
      const { data: twitterTaskConfig, error: twitterTaskError } = await taskClient
        .from('twitter_engagement_tasks')
        .select(
          'engagement_type, target_tweet_id, auto_verify, auto_approve, requires_ai_review, verification_window_hours'
        )
        .eq('task_id', taskId)
        .maybeSingle();

      if (twitterTaskError || !twitterTaskConfig) {
        return NextResponse.json(
          { error: 'Twitter task configuration is missing for this task' },
          { status: 400 }
        );
      }

      const { data: twitterAccount, error: twitterAccountError } = await taskClient
        .from('twitter_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (twitterAccountError || !twitterAccount) {
        return NextResponse.json(
          { error: 'Link your Twitter/X account before submitting this task' },
          { status: 400 }
        );
      }

      if (!submissionData.screenshot_url) {
        return NextResponse.json(
          { error: 'Screenshot evidence URL is required for Twitter/X submissions' },
          { status: 400 }
        );
      }

      if (twitterTaskConfig.engagement_type === 'comment' && !submissionData.comment_text?.trim()) {
        return NextResponse.json(
          { error: 'Comment text is required for comment engagement tasks' },
          { status: 400 }
        );
      }

      const verificationMethod: 'api_auto' | 'screenshot' | 'manual' | 'ai_scored' =
        twitterTaskConfig.engagement_type === 'comment' && twitterTaskConfig.requires_ai_review
          ? 'ai_scored'
          : twitterTaskConfig.auto_verify
            ? 'api_auto'
            : 'screenshot';

      submissionInsertPayload = {
        submission_type: 'twitter',
        description: submissionData.description || null,
        content_link: submissionData.screenshot_url || null,
        content_text: submissionData.comment_text || null,
        custom_fields: {
          screenshot_url: submissionData.screenshot_url || null,
          comment_text: submissionData.comment_text || null,
          engagement_type: twitterTaskConfig.engagement_type,
          target_tweet_id: twitterTaskConfig.target_tweet_id,
          verification_method: verificationMethod,
          auto_approve: twitterTaskConfig.auto_approve,
          verification_window_hours: twitterTaskConfig.verification_window_hours,
        },
      };

      twitterSubmissionInsert = {
        twitter_account_id: twitterAccount.id,
        engagement_type: twitterTaskConfig.engagement_type,
        target_tweet_id: twitterTaskConfig.target_tweet_id,
        verification_method: verificationMethod,
        screenshot_url: submissionData.screenshot_url || null,
        comment_text: submissionData.comment_text?.trim() || null,
      };
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
    const taskSubmissionInsertPayload: Database['public']['Tables']['task_submissions']['Insert'] = {
      ...(submissionInsertPayload as Database['public']['Tables']['task_submissions']['Insert']),
      task_id: taskId,
      user_id: user.id,
    };

    const { data: submission, error: insertError } = await supabase
      .from('task_submissions')
      .insert(taskSubmissionInsertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
    }

    if (twitterSubmissionInsert) {
      const { error: twitterInsertError } = await serviceClient
        .from('twitter_engagement_submissions')
        .insert({
          submission_id: submission.id,
          twitter_account_id: twitterSubmissionInsert.twitter_account_id,
          engagement_type: twitterSubmissionInsert.engagement_type,
          target_tweet_id: twitterSubmissionInsert.target_tweet_id,
          verification_method: twitterSubmissionInsert.verification_method,
          screenshot_url: twitterSubmissionInsert.screenshot_url,
          comment_text: twitterSubmissionInsert.comment_text,
          verified: false,
        });

      if (twitterInsertError) {
        await supabase.from('task_submissions').delete().eq('id', submission.id);
        return NextResponse.json({ error: 'Failed to store Twitter submission evidence' }, { status: 500 });
      }
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
