import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { disputeCommentSchema } from '@/features/disputes/schemas';

/**
 * GET /api/disputes/[id]/comments
 * Fetch comments for a dispute (parties + arbitrator + admin only).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load dispute to check access
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('disputant_id, reviewer_id, arbitrator_id')
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Check user is a party, arbitrator, or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isParty =
      user.id === dispute.disputant_id ||
      user.id === dispute.reviewer_id ||
      user.id === dispute.arbitrator_id;
    const isAdmin = profile?.role === 'admin';

    if (!isParty && !isAdmin) {
      return NextResponse.json(
        { error: 'Only dispute parties and admins can view comments' },
        { status: 403 }
      );
    }

    const { data: comments, error } = await supabase
      .from('dispute_comments')
      .select(
        `
        *,
        user:user_profiles!dispute_comments_user_id_fkey(
          id, name, email, organic_id, avatar_url
        )
      `
      )
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: comments ?? [] });
  } catch (error) {
    console.error('Error fetching dispute comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/disputes/[id]/comments
 * Add a comment to a dispute (parties + arbitrator + admin only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load dispute to check access
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('disputant_id, reviewer_id, arbitrator_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Check user is a party, arbitrator, or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isParty =
      user.id === dispute.disputant_id ||
      user.id === dispute.reviewer_id ||
      user.id === dispute.arbitrator_id;
    const isAdmin = profile?.role === 'admin';

    if (!isParty && !isAdmin) {
      return NextResponse.json(
        { error: 'Only dispute parties and admins can add comments' },
        { status: 403 }
      );
    }

    // Cannot comment on terminal disputes
    const terminalStatuses = ['resolved', 'dismissed', 'withdrawn', 'mediated'];
    if (terminalStatuses.includes(dispute.status)) {
      return NextResponse.json(
        { error: 'Cannot comment on a closed dispute' },
        { status: 400 }
      );
    }

    // Parse input
    const body = await request.json();
    const parseResult = disputeCommentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    const { data: comment, error: insertError } = await supabase
      .from('dispute_comments')
      .insert({
        dispute_id: id,
        user_id: user.id,
        content: input.content,
        visibility: input.visibility,
      })
      .select(
        `
        *,
        user:user_profiles!dispute_comments_user_id_fkey(
          id, name, email, organic_id, avatar_url
        )
      `
      )
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error('Error adding dispute comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
