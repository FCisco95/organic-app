import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProposalSchema } from '@/features/proposals/schemas';
import { normalizeProposalStatus } from '@/features/proposals/types';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

const PROPOSAL_DETAIL_SELECT = `
  *,
  proposal_versions!proposals_current_version_id_fkey(
    id,
    version_number,
    created_at
  ),
  user_profiles!proposals_created_by_fkey(
    organic_id,
    email,
    wallet_pubkey
  )
`;

/**
 * GET /api/proposals/[id]
 * Fetch a single proposal with author profile and current version metadata.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    // Best-effort TTL expiry sweep so stale override promotions auto-revert.
    await supabase.rpc('expire_proposal_override_promotions');

    const { data, error } = await supabase
      .from('proposals')
      .select(PROPOSAL_DETAIL_SELECT)
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
    logger.error('Error fetching proposal:', error);
    return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
  }
}

/**
 * PATCH /api/proposals/[id]
 * Update proposal content. Draft/public edits are mutable; discussion edits are versioned.
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

    // Best-effort TTL expiry sweep so edits happen against fresh lifecycle state.
    await supabase.rpc('expire_proposal_override_promotions');

    // Fetch current proposal state for permissions and merged-body updates.
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select(
        'id, created_by, status, title, body, category, summary, motivation, solution, budget, timeline'
      )
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const lifecycleStatus = normalizeProposalStatus(proposal.status);

    // Check permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthor = user.id === proposal.created_by;
    const isAdmin = Boolean(profile?.role && ['admin', 'council'].includes(profile.role));

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (lifecycleStatus === 'voting' || lifecycleStatus === 'finalized' || lifecycleStatus === 'canceled') {
      return NextResponse.json(
        { error: 'Proposal content is locked after voting starts' },
        { status: 400 }
      );
    }

    // Non-admin authors can only edit mutable author stages.
    if (isAuthor && !isAdmin && !['draft', 'public', 'discussion'].includes(lifecycleStatus)) {
      return NextResponse.json(
        { error: 'Only draft, public, or discussion proposals can be edited' },
        { status: 400 }
      );
    }

    // Parse and validate
    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const { status: nextStatusRaw, ...fields } = parsedBody.data;
    const parseResult = updateProposalSchema.safeParse(fields);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const updates: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    if (typeof nextStatusRaw === 'string') {
      if (nextStatusRaw === 'public' || nextStatusRaw === 'submitted') {
        if (!['draft', 'public'].includes(lifecycleStatus)) {
          return NextResponse.json(
            { error: 'Only draft/public proposals can be moved to public from this endpoint' },
            { status: 400 }
          );
        }
        updates.status = 'public';
      } else if (nextStatusRaw === 'draft') {
        if (lifecycleStatus !== 'draft') {
          return NextResponse.json(
            { error: 'Only draft proposals can remain draft from this endpoint' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: `Use /api/proposals/${proposalId}/status for lifecycle transition to '${nextStatusRaw}'` },
          { status: 400 }
        );
      }
    }

    // Rebuild legacy body text when structured sections changed.
    if (input.summary || input.motivation || input.solution || input.budget !== undefined || input.timeline !== undefined) {
      const merged = { ...proposal, ...input };
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

    const { error: updateError } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', proposalId)
      .select('id')
      .single();

    if (updateError) throw updateError;

    const { data, error: refetchError } = await supabase
      .from('proposals')
      .select(PROPOSAL_DETAIL_SELECT)
      .eq('id', proposalId)
      .single();

    if (refetchError) throw refetchError;

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error updating proposal:', error);
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
    logger.error('Error deleting proposal:', error);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }
}
