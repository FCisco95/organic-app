import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  buildSessionCookie,
  createAdminClient,
  createQaUser,
  deleteQaUser,
  missingEnvVars,
  randomOrganicId,
  runId,
} from './helpers';

test.describe('Gamification quests API', () => {
  test.describe.configure({ mode: 'serial' });

  const missing = missingEnvVars();
  let memberUserId = '';
  let memberCookie = { name: '', value: '' };

  test.beforeEach(async () => {
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`);
  });

  test.beforeAll(async () => {
    if (missing.length > 0) return;

    const supabaseAdmin = createAdminClient();
    const id = runId('gamification_quests_api_qa');
    const pass = 'GamificationQuestsApiQa!Pass123';

    const member = await createQaUser(supabaseAdmin, {
      email: `${id}.member@example.com`,
      password: pass,
      name: 'Gamification Quests API QA Member',
      role: 'member',
      organicId: randomOrganicId(),
      xpTotal: 2_000,
    });

    memberUserId = member.id;
    memberCookie = await buildSessionCookie(member.email, pass);
  });

  test.afterAll(async () => {
    if (missing.length > 0) return;
    const supabaseAdmin = createAdminClient();
    if (memberUserId) await deleteQaUser(supabaseAdmin, memberUserId);
  });

  test('returns quest progress grouped by cadence for authenticated users', async ({ request }) => {
    test.skip(!memberUserId, 'Requires member fixture');

    const res = await request.get(`${BASE_URL}/api/gamification/quests`, {
      headers: {
        Cookie: `${memberCookie.name}=${memberCookie.value}`,
      },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();

    expect(typeof json.generated_at).toBe('string');
    expect(Array.isArray(json.objectives.daily)).toBeTruthy();
    expect(Array.isArray(json.objectives.weekly)).toBeTruthy();
    expect(Array.isArray(json.objectives.long_term)).toBeTruthy();
    expect(json.objectives.daily.length).toBeGreaterThan(0);
    expect(json.objectives.weekly.length).toBeGreaterThan(0);
    expect(json.objectives.long_term.length).toBeGreaterThan(0);
    expect(typeof json.summary.total).toBe('number');
    expect(typeof json.summary.completed).toBe('number');
    expect(Array.isArray(json.summary.items)).toBeTruthy();
  });

  test('returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/gamification/quests`);
    expect(res.status()).toBe(401);
  });
});
