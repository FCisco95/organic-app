import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  proposalStatusChangeSchema,
  proposalResultSchema,
} from '@/features/proposals/schemas';
import {
  canTransitionLifecycleStatus,
  normalizeProposalStatus,
  type LifecycleProposalStatus,
} from '@/features/proposals/types';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

function inferResultFromRequest(
  requestedStatus: string,
  currentResult: string | null,
  explicitResult: string | undefined
): string | null {
  if (explicitResult !== undefined) {
    const parsed = proposalResultSchema.safeParse(explicitResult);
    return parsed.success ? parsed.data : null;
  }

  if (requestedStatus === 'approved') return 'passed';
  if (requestedStatus === 'rejected') return 'failed';

  return currentResult;
}

function requireForwardTransition(
  from: LifecycleProposalStatus,
  to: LifecycleProposalStatus
): string | null {
  if (from === to) return null;
  if (canTransitionLifecycleStatus(from, to)) return null;
  return `Cannot transition from '${from}' to '${to}'`;
}

/**
 * PATCH /api/proposals/[id]/status
 * Update proposal status. Admin/council only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Check admin/council role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: admin or council role required' },
        { status: 403 }
      );
    }

    // Parse request
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const parseResult = proposalStatusChangeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status: requestedStatus, result: explicitResult, reason, override = false } = parseResult.data;

    // Best-effort TTL sweep before transition checks.
    await supabase.rpc('expire_proposal_override_promotions');

    // Fetch current proposal to validate transition.
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, status, result, qualification_override_expires_at')
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const fromLifecycle = normalizeProposalStatus(proposal.status);
    const toLifecycle = normalizeProposalStatus(requestedStatus);

    const transitionError = requireForwardTransition(fromLifecycle, toLifecycle);
    if (transitionError) {
      return NextResponse.json({ error: transitionError }, { status: 400 });
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: toLifecycle,
      updated_at: new Date(now).toISOString(),
    };

    if (toLifecycle === 'finalized') {
      const inferredResult = inferResultFromRequest(
        requestedStatus,
        proposal.result,
        explicitResult
      );

      if (!inferredResult) {
        return NextResponse.json(
          { error: 'Finalized proposals require a result (passed, failed, quorum_not_met)' },
          { status: 400 }
        );
      }

      updates.result = inferredResult;
    }

    if (toLifecycle === 'qualified' || toLifecycle === 'discussion') {
      if (override) {
        if (!reason) {
          return NextResponse.json(
            { error: 'Override transitions require a reason' },
            { status: 400 }
          );
        }

        const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
        updates.qualification_override_expires_at = expiresAt;
        updates.qualification_override_reason = reason;
      }
    }

    if (toLifecycle === 'public' && ['qualified', 'discussion'].includes(fromLifecycle)) {
      const expiresAt = proposal.qualification_override_expires_at
        ? new Date(proposal.qualification_override_expires_at).getTime()
        : null;

      if (!expiresAt || expiresAt > now) {
        return NextResponse.json(
          {
            error:
              'Cannot revert to public before override TTL expires. Wait for automatic expiry or start voting.',
          },
          { status: 400 }
        );
      }
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
    logger.error('Error updating proposal status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
