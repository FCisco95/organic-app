import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTaskSchema } from '@/features/tasks/schemas';
import { extractTweetIdFromUrl } from '@/lib/twitter/utils';
import { parseJsonBody } from '@/lib/parse-json-body';

// POST - Create a new task
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

    // Check role: only admin/council can create tasks
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admin and council members can create tasks' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const validationResult = createTaskSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid task data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Get org_id
    const { data: org } = await supabase
      .from('orgs')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // Create the task
    const { data: task, error: insertError } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description || null,
        task_type: input.task_type,
        is_team_task: input.is_team_task,
        max_assignees: input.max_assignees,
        priority: input.priority,
        base_points: input.base_points ?? 0,
        points: input.base_points ?? 0,
        due_date: input.due_date || null,
        labels: input.labels,
        sprint_id: input.sprint_id || null,
        assignee_id: input.assignee_id || null,
        proposal_id: input.proposal_id || null,
        org_id: org?.id || null,
        created_by: user.id,
        status: 'backlog',
      })
      .select(
        `
        *,
        assignee:user_profiles!tasks_assignee_id_fkey(
          id, name, email, organic_id, avatar_url
        ),
        sprint:sprints(id, name, status)
      `
      )
      .single();

    if (insertError) {
      console.error('Error creating task:', insertError);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    let twitterEngagementTask: Record<string, unknown> | null = null;

    if (input.task_type === 'twitter' && input.twitter_task) {
      const targetTweetId = extractTweetIdFromUrl(input.twitter_task.target_tweet_url);

      if (!targetTweetId) {
        await supabase.from('tasks').delete().eq('id', task.id);
        return NextResponse.json(
          { error: 'Twitter task target_tweet_url must include a valid tweet ID' },
          { status: 400 }
        );
      }

      const { data: twitterTask, error: twitterTaskError } = await supabase
        .from('twitter_engagement_tasks')
        .insert({
          task_id: task.id,
          engagement_type: input.twitter_task.engagement_type,
          target_tweet_url: input.twitter_task.target_tweet_url,
          target_tweet_id: targetTweetId,
          auto_verify: input.twitter_task.auto_verify,
          auto_approve: input.twitter_task.auto_approve,
          requires_ai_review:
            input.twitter_task.engagement_type === 'comment'
              ? true
              : input.twitter_task.requires_ai_review,
          verification_window_hours: input.twitter_task.verification_window_hours,
          instructions: input.twitter_task.instructions || null,
        })
        .select('*')
        .single();

      if (twitterTaskError) {
        console.error('Error creating twitter task metadata:', twitterTaskError);
        await supabase.from('tasks').delete().eq('id', task.id);
        return NextResponse.json({ error: 'Failed to create Twitter task metadata' }, { status: 500 });
      }

      twitterEngagementTask = twitterTask;
    }

    return NextResponse.json(
      {
        task: {
          ...task,
          twitter_engagement_task: twitterEngagementTask,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating task:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
