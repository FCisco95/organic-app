/**
 * Adds the "Upgrade public stats surface" task to the active sprint
 * AND appends a screenshot-pack note to the existing Jupiter Community Tag task.
 *
 * Plan: ~/.claude/plans/i-want-you-to-snuggly-spindle.md (Jupiter add-on, post-review)
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/add-public-stats-task.ts
 *
 * Idempotent — skips the new task if its title already exists in the sprint;
 * skips the Jupiter description update if the screenshot note is already present.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SPRINT_ID = '9dc7ece3-64b7-4672-9e16-17190aa03635';
const JUPITER_TASK_TITLE = 'Apply for Jupiter Community Tag verification';

const SCREENSHOT_NOTE_MARKER =
  '## Screenshot pack for the application (free, do this before submitting)';
const SCREENSHOT_NOTE = [
  '',
  '---',
  '',
  SCREENSHOT_NOTE_MARKER,
  '',
  'Before submitting, capture a screenshot pack of `/pulse` (the auth-gated rich-stats page) to attach to the Community Tag form. Reviewers need to see the data behind the membership wall.',
  '',
  'Screens to capture (1440px desktop + 375px mobile each):',
  '- Member growth chart (last 30 / 90 days)',
  '- Task completion chart',
  '- Proposal category breakdown',
  '- Activity heatmap',
  '- Voting participation list',
  '- Governance summary card',
  '',
  'Save as `docs/jupiter-application-screenshots/` in the repo so the bundle is reproducible. Include them in the application alongside the public `/stats` route URL (built in the parallel task) so the reviewer has both in-context proof and out-of-context detail.',
].join('\n');

const NEW_TASK_TITLE = 'Upgrade public stats surface for external legitimacy (Jupiter signal)';

const NEW_TASK_DESCRIPTION = [
  '**WHAT:** Expand and promote the public-facing stats surface so external visitors (Jupiter Community Tag reviewers, prospective members, $ORG buyers) can immediately see real traction without signing up.',
  '',
  '**WHY:**',
  '- The existing landing-page `<StatsBar />` (rendered at `src/app/[locale]/page.tsx` line 434, "Supporting Stats" footer) shows only 4 metrics in a small, below-the-fold position. Visitors miss it.',
  '- The rich charts on `/pulse` (member growth, task completion, proposal breakdown, activity heatmap, voting participation) are gated behind `useAuth()` — invisible to reviewers and prospects.',
  '- Jupiter Community Tag review weighs qualitative legitimacy (active community, real product, transparent traction). Without a public surface that proves these, reviewers default to whatever they can see, which is currently very little.',
  '- This task closes that gap. Used directly by the Jupiter Community Tag application + every cross-DAO pitch + every press inquiry for the next year.',
  '',
  '**SCOPE:**',
  '',
  '### 1. Extend `/api/stats` endpoint',
  '- File: `src/app/api/stats/route.ts`',
  '- Existing return shape: `{ total_users, org_holders, tasks_completed, active_proposals, org_price }`',
  '- Add 4 new fields:',
  "  - `sprints_completed`: `COUNT(*) FROM sprints WHERE status = 'completed'`",
  "  - `points_distributed`: `COALESCE(SUM(points), 0) FROM tasks WHERE status = 'done'`",
  "  - `member_growth_30d`: `COUNT(*) FROM user_profiles WHERE created_at > NOW() - INTERVAL '30 days'`",
  '  - `days_since_launch`: derived from earliest sprint `start_at` (or hard-coded launch date `2026-04-05` if cleaner)',
  '- Preserve the 120s cache (`unstable_cache` + `s-maxage=120, stale-while-revalidate=300`)',
  '- All queries must use the existing `createAnonClient()` (no service role on this route)',
  '- Add the new fields to the existing `Promise.all` batch (line 19) — keep parallelism',
  '- Verify no consumer downstream breaks: grep for `/api/stats` usage and `total_users`/`org_holders`/`tasks_completed`/`active_proposals` references',
  '',
  '### 2. Upgrade `<StatsBar />` component',
  '- File: `src/components/dashboard/stats-bar.tsx` (currently 35 lines)',
  "- Add an optional `variant?: 'compact' | 'hero'` prop, defaulting to `'compact'` (preserves current rendering)",
  "- `'hero'` variant:",
  '  - Renders all 8 metrics (4 existing + 4 new), grouped into 2 rows of 4',
  '  - Larger typography (text-3xl numbers, terracotta accent)',
  '  - Includes the `member_growth_30d` value with a "+N this month" framing',
  '  - Includes `days_since_launch` rendered as "Day N" or "N days live"',
  '- Add corresponding translation keys to `messages/en.json` under the existing namespace (and mirror to `pt.json`, `es.json`, `fr.json` if they exist — check `messages/` folder)',
  '- Mobile: stack to 2 columns at <640px, single column at <375px',
  '',
  '### 3. Promote StatsBar above the fold on landing page',
  '- File: `src/app/[locale]/page.tsx`',
  '- Currently `<StatsBar />` renders at line 434 inside `{/* -- Supporting Stats -- */}` (compact variant)',
  '- Add a NEW invocation right after the hero block (around line 113, before the contract address panel). Use `<StatsBar variant="hero" />`',
  '- Keep the existing footer one as `variant="compact"` for visual rhythm — OR remove if redundant (your call as you build)',
  "- Ensure the new placement doesn't fight the existing hero blur effects / grid layout",
  '',
  '### 4. Create public `/stats` route',
  '- New file: `src/app/[locale]/stats/page.tsx`',
  '- **No auth.** Server component using `createAnonClient` directly OR a thin client component that fetches `/api/stats` plus needed chart data.',
  '- Layout:',
  '  - Hero: 8 large numbers (mirroring the new `<StatsBar variant="hero" />`)',
  '  - 3 read-only charts pulled from `/pulse` (mirror the existing dynamic-imported components):',
  '    - `MemberGrowthChart`',
  '    - `TaskCompletionChart`',
  '    - `ProposalCategoryChart`',
  '  - These components must accept (or be wrapped to accept) a `public={true}` prop that:',
  '    - Reads aggregate-only data (no per-user fields)',
  '    - Skips the per-user "your contribution" overlays',
  '  - Footer CTA: "Want to contribute? Sign up →" linking to `/signup`',
  '- Add `<link rel="canonical">` and a `metadata` export with description optimized for the Jupiter reviewer use case',
  '- Verify mobile at 320/375/414 widths',
  '',
  '### 5. Translations',
  '- New keys (English copy as canonical):',
  '  - `PublicStats.title`: "Organic by the numbers"',
  '  - `PublicStats.subtitle`: "Real activity, public proof. Updated every 2 minutes."',
  '  - `PublicStats.sprintsCompleted`: "Sprints shipped"',
  '  - `PublicStats.pointsDistributed`: "Points earned"',
  '  - `PublicStats.memberGrowth`: "{count} new this month"',
  '  - `PublicStats.daysSinceLaunch`: "Live for {count} days"',
  '  - `PublicStats.contributorCta`: "Want to contribute? Join Organic →"',
  "- Mirror to all locale files in `messages/` (don't leave keys missing — i18n CI will fail)",
  '',
  '### 6. Tests',
  '- Add unit test for the new `/api/stats` fields: `tests/api/stats.test.ts` (or extend the existing one if present)',
  '- Test that `/stats` route renders without an authenticated session (anonymous fetch returns 200)',
  '- Test that the new `member_growth_30d` correctly excludes users older than 30 days',
  '- Run `npm run lint` and `npm run build` clean',
  '',
  '**FILES TO MODIFY:**',
  '- `src/app/api/stats/route.ts` (extend)',
  '- `src/components/dashboard/stats-bar.tsx` (variant prop)',
  '- `src/app/[locale]/page.tsx` (insert hero StatsBar)',
  '- `messages/en.json` + all other locale files (translation keys)',
  '',
  '**FILES TO CREATE:**',
  '- `src/app/[locale]/stats/page.tsx` (new public route)',
  '- `tests/api/stats.test.ts` (or extend existing)',
  '',
  '**FILES TO REVIEW BUT NOT NECESSARILY MODIFY:**',
  '- `src/app/[locale]/pulse/page.tsx` (mirror chart imports — see line 1–50 for `dynamic(...)` patterns)',
  '- `src/lib/supabase/server.ts` (`createAnonClient` usage)',
  '',
  '**ACCEPTANCE CRITERIA:**',
  '- ✅ `/api/stats` returns the 4 new fields without breaking any existing consumer (run `git grep "total_users\\|org_holders\\|tasks_completed\\|active_proposals"` to find callers)',
  '- ✅ Landing page `/` shows hero stats above the fold at 1440px (no scroll required to see all 8 numbers)',
  '- ✅ `/stats` route renders fully without login (test in incognito)',
  '- ✅ All charts on `/stats` show only aggregate data — verify no PII or per-user info leaks via DevTools network tab',
  '- ✅ Mobile QA at 320, 375, 414, 768px — no overflow, numbers readable, charts responsive',
  '- ✅ All 4 (or more) locale files have the new translation keys',
  '- ✅ `npm run lint` clean, `npm run build` green, `npx vitest run` passes new tests',
  "- ✅ Lighthouse score on `/stats` ≥ 90 (it's a low-JS public page)",
  '- ✅ Cache headers on `/stats` set to `public, s-maxage=120, stale-while-revalidate=300`',
  '',
  '**HOW TO SUBMIT:** PR link with all of the above. Include screenshots of (a) new landing-page hero stats, (b) `/stats` route desktop, (c) `/stats` route mobile.',
  '',
  '**OUT OF SCOPE (do NOT do these in this task):**',
  '- ❌ Real-time updates / WebSockets — 120s cache is fine',
  '- ❌ User-segmented stats (by role, by holder tier) — public aggregate only',
  "- ❌ Historical sparklines / time-series charts beyond what `/pulse` already has — mirror, don't invent",
  "- ❌ Adding `org_price` to the public hero stats — that's a separate decision, may invite price-talk culture (out of brand)",
  '',
  '**DEPENDS ON / RELATED:** This task pairs with the **Apply for Jupiter Community Tag verification** task (#11 in this sprint). Ship this first if possible — the application form will reference the public `/stats` URL and use screenshots from this build.',
  '',
  '**POINTS:** 250 (1.5–2 days solo dev).',
].join('\n');

async function getOrg(): Promise<{ id: string }> {
  const { data, error } = await supabase.from('orgs').select('id').limit(1).single();
  if (error || !data) {
    console.error('No org found:', error?.message);
    process.exit(1);
  }
  return data;
}

async function getAdminUserId(): Promise<string> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('role', 'admin')
    .order('organic_id', { ascending: true, nullsFirst: false })
    .limit(1)
    .single();
  if (error || !data) {
    console.error('No admin user found:', error?.message);
    process.exit(1);
  }
  return data.id;
}

async function insertNewTask(orgId: string, adminId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('tasks')
    .select('id')
    .eq('sprint_id', SPRINT_ID)
    .eq('title', NEW_TASK_TITLE)
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`  Task already exists: ${NEW_TASK_TITLE}`);
    return;
  }

  const { error } = await supabase.from('tasks').insert({
    org_id: orgId,
    sprint_id: SPRINT_ID,
    title: NEW_TASK_TITLE,
    description: NEW_TASK_DESCRIPTION,
    status: 'todo',
    points: 250,
    base_points: 250,
    priority: 'high',
    task_type: 'development',
    labels: ['dev', 'jupiter', 'public-surface', 'feature'],
    is_team_task: false,
    max_assignees: 1,
    assignee_id: adminId,
    created_by: adminId,
  });

  if (error) {
    console.error(`  Failed to insert task:`, error.message);
  } else {
    console.log(`  Task created: ${NEW_TASK_TITLE}`);
  }
}

async function appendScreenshotNoteToJupiterTask(): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('tasks')
    .select('id, description')
    .eq('sprint_id', SPRINT_ID)
    .eq('title', JUPITER_TASK_TITLE)
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error('  Could not fetch Jupiter task:', fetchError.message);
    return;
  }
  if (!existing) {
    console.warn(`  Jupiter task not found in sprint — skipping description update`);
    return;
  }

  if (existing.description?.includes(SCREENSHOT_NOTE_MARKER)) {
    console.log('  Jupiter task already has screenshot note — skipping');
    return;
  }

  const updated = `${existing.description ?? ''}${SCREENSHOT_NOTE}`;

  const { error } = await supabase
    .from('tasks')
    .update({ description: updated })
    .eq('id', existing.id);

  if (error) {
    console.error('  Failed to update Jupiter task description:', error.message);
  } else {
    console.log('  Appended screenshot pack note to Jupiter task');
  }
}

async function main(): Promise<void> {
  console.log(`Updating sprint ${SPRINT_ID}...\n`);
  const org = await getOrg();
  const adminId = await getAdminUserId();
  await insertNewTask(org.id, adminId);
  await appendScreenshotNoteToJupiterTask();
  console.log('\n✅ Done.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Unexpected error';
  console.error('Fatal:', message);
  process.exit(1);
});
