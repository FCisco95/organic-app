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

    const { data: proposalRow } = await supabaseAdmin
      .from('proposals')
      .select('status, finalization_frozen_at')
      .eq('id', proposalBId)
      .single();

    expect(proposalRow?.status).toBe('voting');
    expect(proposalRow?.finalization_frozen_at).toBeTruthy();
  });
});
