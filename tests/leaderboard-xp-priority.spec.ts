import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Leaderboard XP priority', () => {
  const missing = missingEnvVars();
  const fixtureXp = 2_000_000_000;
  const fixtureXpLower = 1_999_000_000;

  let userA: { id: string } | null = null;
  let userB: { id: string } | null = null;
  let userC: { id: string } | null = null;
  let userD: { id: string } | null = null;

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const run = runId('leaderboard_xp_priority_qa');
    const password = 'LeaderboardQa!123';

    userA = await createQaUser(supabaseAdmin, {
      email: `${run}.a@example.com`,
      password,
      name: 'Leaderboard QA A',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: fixtureXp,
    });

    userB = await createQaUser(supabaseAdmin, {
      email: `${run}.b@example.com`,
      password,
      name: 'Leaderboard QA B',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: fixtureXp,
    });

    userC = await createQaUser(supabaseAdmin, {
      email: `${run}.c@example.com`,
      password,
      name: 'Leaderboard QA C',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: fixtureXp,
    });

    userD = await createQaUser(supabaseAdmin, {
      email: `${run}.d@example.com`,
      password,
      name: 'Leaderboard QA D',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: fixtureXpLower,
    });

    const updates = [
      { id: userA.id, xp_total: fixtureXp, total_points: 120, tasks_completed: 5 },
      { id: userB.id, xp_total: fixtureXp, total_points: 120, tasks_completed: 9 },
      { id: userC.id, xp_total: fixtureXp, total_points: 130, tasks_completed: 1 },
      { id: userD.id, xp_total: fixtureXpLower, total_points: 10_000, tasks_completed: 99 },
    ];

    for (const payload of updates) {
      const { error } = await supabaseAdmin.from('user_profiles').update(payload).eq('id', payload.id);
      expect(error).toBeNull();
    }
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const users = [userA, userB, userC, userD].filter((user): user is { id: string } => user !== null);

    for (const user of users) {
      await deleteQaUser(supabaseAdmin, user.id);
    }
  });

  test('orders leaderboard by XP first, then points, then tasks', async ({ request }) => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
    test.skip(!userA || !userB || !userC || !userD, 'Fixture users were not created');

    const response = await request.get(`${BASE_URL}/api/leaderboard?fresh=1`);
    expect(response.status()).toBe(200);

    const payload = await response.json();
    const rows = (payload.leaderboard ?? []) as Array<{ id: string; rank: number }>;
    const byId = new Map(rows.map((entry) => [entry.id, entry]));

    const rowA = byId.get(userA!.id);
    const rowB = byId.get(userB!.id);
    const rowC = byId.get(userC!.id);
    const rowD = byId.get(userD!.id);

    expect(rowA).toBeTruthy();
    expect(rowB).toBeTruthy();
    expect(rowC).toBeTruthy();
    expect(rowD).toBeTruthy();

    expect(rowC!.rank).toBeLessThan(rowB!.rank);
    expect(rowB!.rank).toBeLessThan(rowA!.rank);
    expect(rowA!.rank).toBeLessThan(rowD!.rank);
  });
});
