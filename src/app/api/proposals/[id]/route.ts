import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProposalSchema } from '@/features/proposals/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/proposals/[id]
 * Fetch a single proposal with author profile.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('proposals')
      .select(
        `
        *,
        user_profiles!proposals_created_by_fkey(
          organic_id,
          email,
          wallet_pubkey
        )
      `
      )
      .eq('id', proposalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
  }
}

/**
 * PATCH /api/proposals/[id]
 * Update a proposal. Author can update drafts; admins can update any.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the current proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('created_by, status')
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthor = user.id === proposal.created_by;
    const isAdmin = profile?.role && ['admin', 'council'].includes(profile.role);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Authors can only edit drafts
    if (isAuthor && !isAdmin && proposal.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft proposals can be edited' }, { status: 400 });
    }

    // Parse and validate
    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }
    const { status: newStatus, ...fields } = parsedBody.data;
    const parseResult = updateProposalSchema.safeParse(fields);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Build update object
    const updates: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    // Update legacy body if structured fields changed
    if (input.summary || input.motivation || input.solution) {
      // Fetch full current data to merge
      const { data: current } = await supabase
        .from('proposals')
        .select('summary, motivation, solution, budget, timeline')
        .eq('id', proposalId)
        .single();

      const merged = { ...current, ...input };
      updates.body = [
        merged.summary || '',
        '',
        '## Problem / Motivation',
        merged.motivation || '',
        '',
        '## Proposed Solution',
        merged.solution || '',
        ...(merged.budget ? ['', '## Budget / Resources', merged.budget] : []),
        ...(merged.timeline ? ['', '## Timeline', merged.timeline] : []),
      ].join('\n');
    }

    // Allow status change to submitted (author submitting a draft)
    if (newStatus === 'submitted' && proposal.status === 'draft') {
      updates.status = 'submitted';
    }

    const { data, error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', proposalId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
  }
}

/**
 * DELETE /api/proposals/[id]
 * Delete a proposal. Author can delete drafts; admins can delete any.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RLS handles permission checks (author drafts + admin any)
    const { error } = await supabase.from('proposals').delete().eq('id', proposalId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }
}
