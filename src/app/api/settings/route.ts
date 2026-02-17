import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

const ORG_COLUMNS =
  'id, name, slug, description, logo_url, theme, token_symbol, token_mint, token_decimals, token_total_supply, treasury_wallet, treasury_allocations, organic_id_threshold, default_sprint_duration_days, default_sprint_capacity, rewards_config, created_at, updated_at';
const VOTING_CONFIG_COLUMNS =
  'id, org_id, quorum_percentage, approval_threshold, voting_duration_days, proposal_threshold_org, proposer_cooldown_days, max_live_proposals, abstain_counts_toward_quorum, created_at, updated_at';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch the first org (single-tenant for now)
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select(ORG_COLUMNS)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch voting config linked to this org
    const { data: votingConfig } = await supabase
      .from('voting_config')
      .select(VOTING_CONFIG_COLUMNS)
      .eq('org_id', org.id)
      .single();

    return NextResponse.json({
      data: {
        ...org,
        voting_config: votingConfig ?? null,
      },
    });
  } catch (err) {
    logger.error('Settings GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    // Separate voting config fields from org fields
    const votingFields = [
      'quorum_percentage',
      'approval_threshold',
      'voting_duration_days',
      'proposal_threshold_org',
      'proposer_cooldown_days',
      'max_live_proposals',
      'abstain_counts_toward_quorum',
    ];

    const orgUpdate: Record<string, unknown> = {};
    const votingUpdate: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
      if (votingFields.includes(key)) {
        votingUpdate[key] = value;
      } else {
        orgUpdate[key] = value;
      }
    }

    // Fetch org id
    const { data: org } = await supabase
      .from('orgs')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Update org if there are org fields
    if (Object.keys(orgUpdate).length > 0) {
      const { error: orgError } = await supabase.from('orgs').update(orgUpdate).eq('id', org.id);

      if (orgError) {
        logger.error('Org update error:', orgError);
        return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
      }
    }

    // Update voting config if there are voting fields
    if (Object.keys(votingUpdate).length > 0) {
      const { error: votingError } = await supabase
        .from('voting_config')
        .update(votingUpdate)
        .eq('org_id', org.id);

      if (votingError) {
        logger.error('Voting config update error:', votingError);
        return NextResponse.json(
          { error: 'Failed to update governance settings' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Settings PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
