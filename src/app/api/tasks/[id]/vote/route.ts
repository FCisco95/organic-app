import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { voteBacklogSchema } from '@/features/backlog/schemas';

type RouteParams = { params: Promise<{ id: string }> };

function normalize(value: 'up' | 'down' | 'none'): -1 | 0 | 1 {
  if (value === 'up') return 1;
  if (value === 'down') return -1;
  return 0;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ data: null, error: parsedBody.error }, { status: 400 });
    }
    const parsed = voteBacklogSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Invalid request' }, { status: 400 });
    }
    const desired = normalize(parsed.data.value);

    const [profileResult, taskResult, existingResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, organic_id')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('tasks')
        .select('id, status, sprint_id')
        .eq('id', taskId)
        .single(),
      supabase
        .from('backlog_votes')
        .select('id, value')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ data: null, error: 'Profile not found' }, { status: 404 });
    }
    if (!profileResult.data.organic_id) {
      return NextResponse.json(
        { data: null, error: 'Organic ID required to vote' },
        { status: 403 },
      );
    }
    if (taskResult.error || !taskResult.data) {
      return NextResponse.json({ data: null, error: 'Task not found' }, { status: 404 });
    }
    const task = taskResult.data;
    if (task.status !== 'backlog' || task.sprint_id !== null) {
      return NextResponse.json(
        { data: null, error: 'Voting is only allowed on backlog tasks' },
        { status: 409 },
      );
    }

    const existing = existingResult.data;
    const existingValue = Number(existing?.value ?? 0);
    const shouldClear = desired === 0 || (existing && existingValue === desired);

    if (shouldClear && existing) {
      const { error } = await supabase
        .from('backlog_votes')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', user.id);
      if (error) {
        logger.error('backlog vote delete failed', error);
        return NextResponse.json({ data: null, error: 'Failed to clear vote' }, { status: 500 });
      }
    }

    if (!shouldClear) {
      const { error } = await supabase.from('backlog_votes').upsert(
        { task_id: taskId, user_id: user.id, value: desired },
        { onConflict: 'task_id,user_id' },
      );
      if (error) {
        logger.error('backlog vote upsert failed', error);
        return NextResponse.json({ data: null, error: 'Failed to cast vote' }, { status: 500 });
      }
    }

    const finalVote: -1 | 0 | 1 = shouldClear ? 0 : desired;

    const { data: snapshot } = await supabase
      .from('tasks')
      .select('id, upvotes, downvotes')
      .eq('id', taskId)
      .single();

    return NextResponse.json({
      data: {
        task_id: taskId,
        upvotes: snapshot?.upvotes ?? 0,
        downvotes: snapshot?.downvotes ?? 0,
        my_vote: finalVote,
      },
      error: null,
    });
  } catch (error) {
    logger.error('backlog vote route error', error);
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 });
  }
}
