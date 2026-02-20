import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { settingsPatchSchema } from '@/features/settings/schemas';
import { logger } from '@/lib/logger';
import type { Json } from '@/types/database';

const ORG_COLUMNS =
  'id, name, slug, description, logo_url, theme, token_symbol, token_mint, token_decimals, token_total_supply, treasury_wallet, treasury_allocations, organic_id_threshold, default_sprint_duration_days, default_sprint_capacity, governance_policy, sprint_policy, rewards_config, created_at, updated_at';
const VOTING_CONFIG_COLUMNS =
  'id, org_id, quorum_percentage, approval_threshold, voting_duration_days, proposal_threshold_org, proposer_cooldown_days, max_live_proposals, abstain_counts_toward_quorum, created_at, updated_at';

type AuditScope = 'org' | 'voting_config' | 'governance_policy' | 'sprint_policy' | 'rewards_config';

const SPECIAL_ORG_SCOPES = new Set(['governance_policy', 'sprint_policy', 'rewards_config']);

function pickPayload(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
): Json {
  const payload: Record<string, unknown> = {};
  for (const key of keys) {
    payload[key] = source?.[key] ?? null;
  }
  return payload as Json;
}

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
    const actorRole: 'admin' = 'admin';

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const validationResult = settingsPatchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const validated = validationResult.data;
    const { reason, ...updateFields } = validated;

    // Separate voting config fields from org fields
    const votingFields = [
      'quorum_percentage',
      'approval_threshold',
      'voting_duration_days',
      'proposal_threshold_org',
      'proposer_cooldown_days',
      'max_live_proposals',
      'abstain_counts_toward_quorum',
    ] as const;

    const orgUpdate: Record<string, unknown> = {};
    const votingUpdate: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updateFields)) {
      if ((votingFields as readonly string[]).includes(key)) {
        votingUpdate[key] = value;
      } else {
        orgUpdate[key] = value;
      }
    }

    if (Object.keys(orgUpdate).length === 0 && Object.keys(votingUpdate).length === 0) {
      return NextResponse.json({ error: 'No settings fields to update' }, { status: 400 });
    }

    // Fetch org id
    const { data: orgIdRow } = await supabase
      .from('orgs')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!orgIdRow) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { data: orgBefore, error: orgBeforeError } = await supabase
      .from('orgs')
      .select(ORG_COLUMNS)
      .eq('id', orgIdRow.id)
      .single();

    if (orgBeforeError || !orgBefore) {
      logger.error('Org fetch before update error:', orgBeforeError);
      return NextResponse.json({ error: 'Failed to load organization settings' }, { status: 500 });
    }

    const { data: votingBefore } = await supabase
      .from('voting_config')
      .select(VOTING_CONFIG_COLUMNS)
      .eq('org_id', orgIdRow.id)
      .single();

    // Update org if there are org fields
    if (Object.keys(orgUpdate).length > 0) {
      const { error: orgError } = await supabase.from('orgs').update(orgUpdate).eq('id', orgIdRow.id);

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
        .eq('org_id', orgIdRow.id);

      if (votingError) {
        logger.error('Voting config update error:', votingError);
        return NextResponse.json(
          { error: 'Failed to update governance settings' },
          { status: 500 }
        );
      }
    }

    const auditRows: {
      org_id: string;
      actor_id: string;
      actor_role: 'admin' | 'council' | 'member' | 'guest';
      reason: string;
      change_scope: AuditScope;
      previous_payload: Json;
      new_payload: Json;
      metadata: Json;
    }[] = [];

    const orgUpdateKeys = Object.keys(orgUpdate);
    const orgBaseKeys = orgUpdateKeys.filter((key) => !SPECIAL_ORG_SCOPES.has(key));
    if (orgBaseKeys.length > 0) {
      auditRows.push({
        org_id: orgIdRow.id,
        actor_id: user.id,
        actor_role: actorRole,
        reason,
        change_scope: 'org',
        previous_payload: pickPayload(orgBefore as Record<string, unknown>, orgBaseKeys),
        new_payload: pickPayload(orgUpdate, orgBaseKeys),
        metadata: { route: '/api/settings' },
      });
    }

    const pushSpecialAuditRow = (scope: AuditScope, key: string) => {
      if (!(key in orgUpdate)) return;
      auditRows.push({
        org_id: orgIdRow.id,
        actor_id: user.id,
        actor_role: actorRole,
        reason,
        change_scope: scope,
        previous_payload: { [key]: (orgBefore as Record<string, unknown>)[key] ?? null } as Json,
        new_payload: { [key]: orgUpdate[key] ?? null } as Json,
        metadata: { route: '/api/settings' },
      });
    };

    pushSpecialAuditRow('governance_policy', 'governance_policy');
    pushSpecialAuditRow('sprint_policy', 'sprint_policy');
    pushSpecialAuditRow('rewards_config', 'rewards_config');

    const votingUpdateKeys = Object.keys(votingUpdate);
    if (votingUpdateKeys.length > 0) {
      auditRows.push({
        org_id: orgIdRow.id,
        actor_id: user.id,
        actor_role: actorRole,
        reason,
        change_scope: 'voting_config',
        previous_payload: pickPayload((votingBefore ?? {}) as Record<string, unknown>, votingUpdateKeys),
        new_payload: pickPayload(votingUpdate, votingUpdateKeys),
        metadata: { route: '/api/settings' },
      });
    }

    if (auditRows.length > 0) {
      const { error: auditError } = await supabase.from('admin_config_audit_events').insert(auditRows);

      if (auditError) {
        logger.error('Config audit insert error:', auditError);
        return NextResponse.json({ error: 'Failed to persist settings audit event' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Settings PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
