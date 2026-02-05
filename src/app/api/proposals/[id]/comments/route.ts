import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addCommentSchema } from '@/features/proposals/schemas';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/proposals/[id]/comments
 * Fetch all comments for a proposal.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
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
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching comments:', error);
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
    const rawBody = await request.json();
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
    console.error('Error posting comment:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
