import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkTokenThreshold,
  checkMaxLiveProposals,
  checkCooldownPeriod,
  isPrivilegedRole,
} from '@/features/proposals/anti-abuse';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, wallet_pubkey, organic_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.organic_id) {
      return NextResponse.json({
        eligible: false,
        reason: 'no_organic_id',
        checks: {},
      });
    }

    // Privileged roles bypass all checks
    if (isPrivilegedRole(profile.role)) {
      return NextResponse.json({
        eligible: true,
        privileged: true,
        checks: {},
      });
    }

    // Fetch voting config
    const { data: config } = await supabase
      .from('voting_config')
      .select('proposal_threshold_org, max_live_proposals, proposer_cooldown_days')
      .is('org_id', null)
      .maybeSingle();

    const threshold = config?.proposal_threshold_org ?? 0;
    const maxLive = config?.max_live_proposals ?? 3;
    const cooldownDays = config?.proposer_cooldown_days ?? 0;

    // Check token balance
    const thresholdResult = checkTokenThreshold({
      threshold,
      walletPubkey: profile.wallet_pubkey,
      balance: null, // Will be populated by on-chain check if threshold > 0
    });

    // Check active proposals count
    const { count: activeCount } = await supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .in('status', ['draft', 'public', 'qualified', 'discussion', 'voting', 'submitted']);

    const maxLiveResult = checkMaxLiveProposals(activeCount ?? 0, maxLive);

    // Check cooldown
    const { data: lastProposal } = await supabase
      .from('proposals')
      .select('created_at')
      .eq('created_by', user.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cooldownResult = checkCooldownPeriod(
      lastProposal?.created_at ? new Date(lastProposal.created_at) : null,
      cooldownDays
    );

    const eligible = thresholdResult.ok && maxLiveResult.ok && cooldownResult.ok;

    return NextResponse.json({
      eligible,
      privileged: false,
      checks: {
        threshold: thresholdResult,
        maxLive: maxLiveResult,
        cooldown: cooldownResult,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
