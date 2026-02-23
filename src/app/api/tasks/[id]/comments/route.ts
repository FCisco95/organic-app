import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { createCommentSchema } from '@/features/tasks/schemas';

// GET - Fetch comments for a task with cursor pagination
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
    const before = searchParams.get('before'); // cursor: ISO timestamp

    let query = supabase
      .from('task_comments')
      .select(
        `
        *,
        user:user_profiles!task_comments_user_id_fkey(
          id,
          name,
          email,
          organic_id,
          avatar_url
        )
      `
      )
      .eq('task_id', id)
      .order('created_at', { ascending: true })
      .limit(limit + 1); // fetch one extra to detect hasMore

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: comments, error } = await query;

    if (error) {
      logger.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    const hasMore = (comments?.length ?? 0) > limit;
    const results = hasMore ? comments!.slice(0, limit) : (comments ?? []);

    return NextResponse.json({
      comments: results,
      hasMore,
      nextCursor: hasMore ? results[results.length - 1]?.created_at : null,
    });
  } catch (error) {
    logger.error('Error in comments route:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new comment
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { data: comment, error } = await supabase
      .from('task_comments')
        .insert({
          task_id: id,
          user_id: user.id,
          content: parsed.data.content,
        })
      .select(
        `
        *,
        user:user_profiles!task_comments_user_id_fkey(
          id,
          name,
          email,
          organic_id,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      logger.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    logger.error('Error in create comment:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
