import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addCommentSchema } from '@/features/proposals/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/proposals/[id]/comments
 * Fetch comments for a proposal with cursor pagination.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
    const before = searchParams.get('before'); // cursor: ISO timestamp

    let query = supabase
      .from('comments')
      .select(
        `
        *,
        user_profiles!comments_user_id_fkey(
          organic_id,
          email
        )
      `
      )
      .eq('subject_type', 'proposal')
      .eq('subject_id', proposalId)
      .order('created_at', { ascending: true })
      .limit(limit + 1);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    const hasMore = (data?.length ?? 0) > limit;
    const results = hasMore ? data!.slice(0, limit) : (data ?? []);

    return NextResponse.json({
      comments: results,
      hasMore,
      nextCursor: hasMore ? results[results.length - 1]?.created_at : null,
    });
  } catch (error) {
    logger.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * POST /api/proposals/[id]/comments
 * Add a comment to a proposal. Requires authentication.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate
    const { data: rawBody, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parseResult = addCommentSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Verify proposal exists
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id')
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        subject_type: 'proposal',
        subject_id: proposalId,
        user_id: user.id,
        body: parseResult.data.body,
      })
      .select(
        `
        *,
        user_profiles!comments_user_id_fkey(
          organic_id,
          email
        )
      `
      )
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error posting comment:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
