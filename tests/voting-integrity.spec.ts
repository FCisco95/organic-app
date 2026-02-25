import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import {
  missingEnvVars,
  createAdminClient,
  createQaUser,
  buildSessionCookie,
  deleteQaUser,
  randomOrganicId,
  runId,
  cookieHeader,
  BASE_URL,
} from './helpers';

async function postStartVotingWithRetry(input: {
  request: APIRequestContext;
  proposalId: string;
  councilCookie: { name: string; value: string };
  data: { voting_duration_days: number; snapshot_holders: Array<{ address: string; balance: number }> };
}): Promise<APIResponse> {
  const { request, proposalId, councilCookie, data } = input;

  const first = await request.post(`${BASE_URL}/api/proposals/${proposalId}/start-voting`, {
    headers: { Cookie: cookieHeader(councilCookie) },
    data,
  });

  if (first.status() !== 500) {
    return first;
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  return request.post(`${BASE_URL}/api/proposals/${proposalId}/start-voting`, {
    headers: { Cookie: cookieHeader(councilCookie) },
    data,
  });
}

test.describe('Voting snapshot and finalization integrity', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();

  let adminUserId = '';
  let councilUserId = '';
  let memberAUserId = '';
  let memberBUserId = '';

  let councilCookie = { name: '', value: '' };
  let memberACookie = { name: '', value: '' };

  let proposalAId: string | null = null;
  let proposalBId: string | null = null;

  const walletA = `${runId('wallet_a')}_pubkey`;
  const walletB = `${runId('wallet_b')}_pubkey`;

  const summaryText =
    'This proposal introduces deterministic voting snapshots so governance state can be audited with confidence across all lifecycle transitions.';
  const motivationText =
    'Current voting finalization behavior allows race conditions and non-idempotent commits that can reduce trust, so this proposal hardens the lifecycle around snapshot boundaries, delegation handling, and finalization retries.';
  const solutionText =
    'Implement transactional snapshot capture, immutable voter snapshot rows, advisory-locked finalization with dedupe keys, and explicit freeze behavior after repeated finalization errors so operators can recover safely.';

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('voting_integrity_qa');
    const pass = 'VotingIntegrityQa!Pass123';

    const admin = await createQaUser(supabaseAdmin, {
      email: `${id}.admin@example.com`,
      password: pass,
      name: 'Voting Integrity QA Admin',
      role: 'admin',
      organicId: randomOrganicId(),
    });
    adminUserId = admin.id;

    const council = await createQaUser(supabaseAdmin, {
      email: `${id}.council@example.com`,
      password: pass,
      name: 'Voting Integrity QA Council',
      role: 'council',
      organicId: randomOrganicId(),
    });
    councilUserId = council.id;
    councilCookie = await buildSessionCookie(council.email, pass);

    const memberA = await createQaUser(supabaseAdmin, {
      email: `${id}.membera@example.com`,
      password: pass,
      name: 'Voting Integrity QA Member A',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberAUserId = memberA.id;
    memberACookie = await buildSessionCookie(memberA.email, pass);

    const memberB = await createQaUser(supabaseAdmin, {
      email: `${id}.memberb@example.com`,
      password: pass,
      name: 'Voting Integrity QA Member B',
      role: 'member',
      organicId: randomOrganicId(),
    });
    memberBUserId = memberB.id;

    await supabaseAdmin
      .from('user_profiles')
      .update({ wallet_pubkey: walletA })
      .eq('id', memberAUserId);

    await supabaseAdmin
      .from('user_profiles')
      .update({ wallet_pubkey: walletB })
      .eq('id', memberBUserId);

    // Disable proposer cooldown so the second proposal creation in the serial
    // suite doesn't hit the 7-day default cooldown (which returns 429).
    await supabaseAdmin
      .from('voting_config')
      .update({ proposer_cooldown_days: 0 })
      .is('org_id', null);
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();

    if (proposalAId) {
      await supabaseAdmin.from('proposals').delete().eq('id', proposalAId);
    }

    if (proposalBId) {
      await supabaseAdmin.from('proposals').delete().eq('id', proposalBId);
    }

    if (adminUserId) await deleteQaUser(supabaseAdmin, adminUserId);
    if (councilUserId) await deleteQaUser(supabaseAdmin, councilUserId);
    if (memberAUserId) await deleteQaUser(supabaseAdmin, memberAUserId);
    if (memberBUserId) await deleteQaUser(supabaseAdmin, memberBUserId);
  });

  test('freezes snapshot voting power and finalizes idempotently', async ({ request }) => {
    test.setTimeout(120_000);

    const supabaseAdmin = createAdminClient();

    const createRes = await request.post(`${BASE_URL}/api/proposals`, {
      headers: { Cookie: cookieHeader(memberACookie) },
      data: {
        status: 'public',
        title: 'Voting Integrity QA Proposal A',
        category: 'governance',
        summary: summaryText,
        motivation: motivationText,
        solution: solutionText,
      },
    });

    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    proposalAId = created.id;

    const discussionRes = await request.patch(`${BASE_URL}/api/proposals/${proposalAId}/status`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { status: 'discussion' },
    });

    expect(discussionRes.status()).toBe(200);

    const startRes = await postStartVotingWithRetry({
      request,
      proposalId: proposalAId,
      councilCookie,
      data: {
        voting_duration_days: 1,
        snapshot_holders: [
          { address: walletA, balance: 10 },
          { address: walletB, balance: 2 },
        ],
      },
    });

    expect(startRes.status()).toBe(200);
    const started = await startRes.json();
    expect(started?.integrity?.server_voting_started_at).toBeTruthy();
    expect(Number(started?.snapshot?.total_supply ?? 0)).toBe(12);

    await supabaseAdmin
      .from('holder_snapshots')
      .update({ balance_ui: 999 })
      .eq('proposal_id', proposalAId)
      .eq('wallet_pubkey', walletA);

    const weightRes = await request.get(`${BASE_URL}/api/proposals/${proposalAId}/vote`, {
      headers: { Cookie: cookieHeader(memberACookie) },
    });

    expect(weightRes.status()).toBe(200);
    const weightBody = await weightRes.json();
    expect(Number(weightBody.voting_weight ?? 0)).toBe(10);
    expect(weightBody.weight_source).toBe('voter_snapshot');

    const voteRes = await request.post(`${BASE_URL}/api/proposals/${proposalAId}/vote`, {
      headers: { Cookie: cookieHeader(memberACookie) },
      data: { value: 'yes' },
    });

    expect(voteRes.status()).toBe(200);
    const voted = await voteRes.json();
    expect(Number(voted.vote.weight ?? 0)).toBe(10);

    await supabaseAdmin
      .from('proposals')
      .update({ voting_ends_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('id', proposalAId);

    const dedupeKey = `qa-finalize-${proposalAId}`;

    const finalizeRes1 = await request.post(`${BASE_URL}/api/proposals/${proposalAId}/finalize`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { dedupe_key: dedupeKey },
    });

    expect(finalizeRes1.status()).toBe(200);
    const finalized1 = await finalizeRes1.json();
    expect(finalized1?.proposal?.status).toBe('finalized');
    expect(finalized1?.idempotency?.already_finalized).toBe(false);

    const finalizeRes2 = await request.post(`${BASE_URL}/api/proposals/${proposalAId}/finalize`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { dedupe_key: dedupeKey },
    });

    expect(finalizeRes2.status()).toBe(200);
    const finalized2 = await finalizeRes2.json();
    expect(finalized2?.idempotency?.already_finalized).toBe(true);

    const { data: finalizedRow } = await supabaseAdmin
      .from('proposals')
      .select(
        'status, result, finalization_dedupe_key, finalization_attempts, finalization_frozen_at'
      )
      .eq('id', proposalAId)
      .single();
    expect(finalizedRow?.status).toBe('finalized');
    expect(finalizedRow?.result).toBe('passed');
    expect(finalizedRow?.finalization_dedupe_key).toBe(dedupeKey);
    expect(Number(finalizedRow?.finalization_attempts ?? 0)).toBeGreaterThanOrEqual(1);
    expect(finalizedRow?.finalization_frozen_at).toBeNull();
  });

  test('freezes proposal when finalization fails twice', async ({ request }) => {
    test.setTimeout(120_000);

    const supabaseAdmin = createAdminClient();

    const createRes = await request.post(`${BASE_URL}/api/proposals`, {
      headers: { Cookie: cookieHeader(memberACookie) },
      data: {
        status: 'public',
        title: 'Voting Integrity QA Proposal B',
        category: 'governance',
        summary: summaryText,
        motivation: motivationText,
        solution: solutionText,
      },
    });

    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    proposalBId = created.id;

    const discussionRes = await request.patch(`${BASE_URL}/api/proposals/${proposalBId}/status`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: { status: 'discussion' },
    });

    expect(discussionRes.status()).toBe(200);

    const startRes = await postStartVotingWithRetry({
      request,
      proposalId: proposalBId,
      councilCookie,
      data: {
        voting_duration_days: 1,
        snapshot_holders: [{ address: walletA, balance: 5 }],
      },
    });

    expect(startRes.status()).toBe(200);

    await supabaseAdmin
      .from('proposals')
      .update({ voting_ends_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('id', proposalBId);

    const finalizeRes = await request.post(`${BASE_URL}/api/proposals/${proposalBId}/finalize`, {
      headers: { Cookie: cookieHeader(councilCookie) },
      data: {
        dedupe_key: `qa-finalize-fail-${proposalBId}`,
        test_fail_mode: 'always',
      },
    });

    expect(finalizeRes.status()).toBe(423);
    const finalizeBody = await finalizeRes.json();
    expect(finalizeBody.code).toBe('FINALIZATION_FROZEN');
    const frozenDedupeKey = `qa-finalize-fail-${proposalBId}`;
    expect(finalizeBody.dedupe_key).toBe(frozenDedupeKey);
    expect(Number(finalizeBody.attempt_count ?? 0)).toBeGreaterThanOrEqual(2);

    const { data: proposalRow } = await supabaseAdmin
      .from('proposals')
      .select(
        'status, finalization_frozen_at, finalization_attempts, finalization_failure_reason, finalization_dedupe_key'
      )
      .eq('id', proposalBId)
      .single();

    expect(proposalRow?.status).toBe('voting');
    expect(proposalRow?.finalization_frozen_at).toBeTruthy();
    expect(Number(proposalRow?.finalization_attempts ?? 0)).toBeGreaterThanOrEqual(2);
    expect(String(proposalRow?.finalization_failure_reason ?? '')).toContain(
      'Simulated finalization failure'
    );
    expect(proposalRow?.finalization_dedupe_key).toBe(frozenDedupeKey);

    const { data: freezeEvents, error: freezeEventsError } = await supabaseAdmin
      .from('proposal_stage_events')
      .select('actor_id, from_status, to_status, reason, metadata')
      .eq('proposal_id', proposalBId)
      .eq('reason', 'finalization_kill_switch')
      .order('created_at', { ascending: false })
      .limit(1);
    expect(freezeEventsError).toBeNull();
    expect(freezeEvents?.length).toBe(1);

    const freezeEvent = freezeEvents?.[0];
    expect(freezeEvent?.actor_id).toBe(councilUserId);
    expect(freezeEvent?.from_status).toBe('voting');
    expect(freezeEvent?.to_status).toBe('voting');
    const freezeMetadata = (freezeEvent?.metadata ?? {}) as Record<string, unknown>;
    expect(freezeMetadata.source).toBe('finalize_proposal_voting_integrity');
    expect(freezeMetadata.dedupe_key).toBe(frozenDedupeKey);
    expect(Number(freezeMetadata.attempt_count ?? 0)).toBeGreaterThanOrEqual(2);
    expect(String(freezeMetadata.error ?? '')).toContain('Simulated finalization failure');

    const manualResumeReason = `qa_manual_resume_${Date.now()}`;
    const { error: unfreezeError } = await supabaseAdmin
      .from('proposals')
      .update({
        finalization_frozen_at: null,
        finalization_failure_reason: null,
      })
      .eq('id', proposalBId);
    expect(unfreezeError).toBeNull();

    const { error: resumeAuditError } = await supabaseAdmin
      .from('proposal_stage_events')
      .insert({
        proposal_id: proposalBId!,
        from_status: 'voting',
        to_status: 'voting',
        actor_id: councilUserId,
        reason: 'finalization_manual_resume',
        metadata: {
          source: 'qa_operational_recovery',
          dedupe_key: frozenDedupeKey,
          previous_frozen_at: proposalRow?.finalization_frozen_at,
          prior_attempt_count: Number(proposalRow?.finalization_attempts ?? 0),
          resume_reason: manualResumeReason,
        },
      });
    expect(resumeAuditError).toBeNull();

    const resumedFinalizeRes = await request.post(
      `${BASE_URL}/api/proposals/${proposalBId}/finalize`,
      {
        headers: { Cookie: cookieHeader(councilCookie) },
        data: { dedupe_key: frozenDedupeKey },
      }
    );
    expect(resumedFinalizeRes.status()).toBe(200);
    const resumedFinalizeBody = await resumedFinalizeRes.json();
    expect(resumedFinalizeBody?.proposal?.status).toBe('finalized');
    expect(resumedFinalizeBody?.idempotency?.already_finalized).toBe(false);

    const { data: resumedRow } = await supabaseAdmin
      .from('proposals')
      .select('status, finalization_frozen_at, finalization_failure_reason, finalization_dedupe_key')
      .eq('id', proposalBId)
      .single();
    expect(resumedRow?.status).toBe('finalized');
    expect(resumedRow?.finalization_frozen_at).toBeNull();
    expect(resumedRow?.finalization_failure_reason).toBeNull();
    expect(resumedRow?.finalization_dedupe_key).toBe(frozenDedupeKey);

    const { data: resumeEvents, error: resumeEventsError } = await supabaseAdmin
      .from('proposal_stage_events')
      .select('actor_id, reason, metadata')
      .eq('proposal_id', proposalBId)
      .eq('reason', 'finalization_manual_resume')
      .order('created_at', { ascending: false })
      .limit(1);
    expect(resumeEventsError).toBeNull();
    expect(resumeEvents?.length).toBe(1);
    expect(resumeEvents?.[0]?.actor_id).toBe(councilUserId);
    const resumeMetadata = (resumeEvents?.[0]?.metadata ?? {}) as Record<string, unknown>;
    expect(resumeMetadata.source).toBe('qa_operational_recovery');
    expect(resumeMetadata.dedupe_key).toBe(frozenDedupeKey);
  });
});
