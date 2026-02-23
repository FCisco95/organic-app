import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProposalSchema } from '@/features/proposals/schemas';
import { isPrivilegedRole } from '@/features/proposals/anti-abuse';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

/** Statuses considered "active" for the max-live-proposals check. */
const ACTIVE_STATUSES = ['public', 'qualified', 'discussion', 'voting', 'submitted'] as const;

/**
 * POST /api/proposals
 * Create a new proposal. Requires verified member (Organic ID).
 * Enforces governance anti-abuse rules from voting_config:
 *   1. Token threshold gate
 *   2. Max live proposals per proposer
 *   3. Cooldown period between proposals
 * Admin and council roles bypass all governance checks.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile — check for Organic ID (verified member)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organic_id, role, wallet_pubkey')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.organic_id) {
      return NextResponse.json(
        { error: 'You must have an Organic ID to create proposals' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }
    const { status: submitStatus, ...fields } = parsedBody.data;
    const parseResult = createProposalSchema.safeParse(fields);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // ── Governance anti-abuse checks (admin/council bypass) ──────────
    const isPrivileged = isPrivilegedRole(profile.role);

    if (!isPrivileged) {
      const { data: config } = await supabase
        .from('voting_config')
        .select('proposal_threshold_org, proposer_cooldown_days, max_live_proposals')
        .limit(1)
        .single();

      if (config) {
        // 1. Token threshold gate
        const threshold = Number(config.proposal_threshold_org) || 0;
        if (threshold > 0) {
          if (!profile.wallet_pubkey) {
            return NextResponse.json(
              {
                error: 'A linked wallet is required to create proposals',
                required_balance: threshold,
              },
              { status: 403 }
            );
          }

          // Look up the latest holder snapshot for this wallet
          const { data: snapshot } = await supabase
            .from('holder_snapshots')
            .select('balance_ui')
            .eq('wallet_pubkey', profile.wallet_pubkey)
            .order('taken_at', { ascending: false })
            .limit(1)
            .single();

          const balance = snapshot ? Number(snapshot.balance_ui) : 0;
          if (balance < threshold) {
            return NextResponse.json(
              {
                error: `Insufficient token balance to create proposals (required: ${threshold}, current: ${balance})`,
                required_balance: threshold,
                current_balance: balance,
              },
              { status: 403 }
            );
          }
        }

        // 2. Max live proposals
        const maxLive = config.max_live_proposals ?? 1;
        const { count: activeCount } = await supabase
          .from('proposals')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .in('status', [...ACTIVE_STATUSES]);

        if (activeCount !== null && activeCount >= maxLive) {
          return NextResponse.json(
            {
              error: `You already have ${activeCount} active proposal(s). Maximum allowed: ${maxLive}`,
              active_count: activeCount,
              max_allowed: maxLive,
            },
            { status: 409 }
          );
        }

        // 3. Cooldown period
        const cooldownDays = config.proposer_cooldown_days ?? 7;
        if (cooldownDays > 0) {
          const { data: latestProposal } = await supabase
            .from('proposals')
            .select('created_at')
            .eq('created_by', user.id)
            .not('status', 'eq', 'draft')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (latestProposal?.created_at) {
            const createdAt = new Date(latestProposal.created_at).getTime();
            const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
            const cooldownEnds = createdAt + cooldownMs;
            const now = Date.now();

            if (cooldownEnds > now) {
              const remainingMs = cooldownEnds - now;
              const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
              return NextResponse.json(
                {
                  error: `Please wait ${remainingDays} day(s) before creating another proposal`,
                  retry_after: new Date(cooldownEnds).toISOString(),
                  cooldown_days: cooldownDays,
                },
                { status: 429 }
              );
            }
          }
        }
      }
    }
    // ── End governance checks ────────────────────────────────────────

    const input = parseResult.data;
    const proposalStatus =
      submitStatus === 'submitted' || submitStatus === 'public' ? 'public' : 'draft';

    // Build legacy body from structured sections
    const bodyText = [
      input.summary,
      '',
      '## Problem / Motivation',
      input.motivation,
      '',
      '## Proposed Solution',
      input.solution,
      ...(input.budget ? ['', '## Budget / Resources', input.budget] : []),
      ...(input.timeline ? ['', '## Timeline', input.timeline] : []),
    ].join('\n');

    const { data, error } = await supabase
      .from('proposals')
      .insert({
        title: input.title,
        body: bodyText,
        category: input.category,
        summary: input.summary,
        motivation: input.motivation,
        solution: input.solution,
        budget: input.budget || null,
        timeline: input.timeline || null,
        status: proposalStatus,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error creating proposal:', error);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }
}
