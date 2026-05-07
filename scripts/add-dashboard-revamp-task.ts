/**
 * Adds the "Revamp the dashboard into a flagship multi-tenant SaaS surface"
 * task to the active sprint.
 *
 * Plan: ~/.claude/plans/i-want-to-transient-matsumoto.md
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/add-dashboard-revamp-task.ts
 *
 * Idempotent — skips if a task with the same title already exists in the sprint.
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
const TASK_TITLE = 'Revamp the dashboard into a flagship multi-tenant SaaS surface';

const TASK_DESCRIPTION = [
  '**WHAT:** Build a brand-new `/dashboard` route that serves as both (a) the logged-in member home for Organic and (b) the SaaS template every future tenant community will run with their own branding. Sprint-centric IA, AI-augmented, "alive" via polled refresh, and theme-ready for multi-tenancy without buying multi-tenant infrastructure yet.',
  '',
  '**WHY:**',
  '- Current state: there is NO `/dashboard` route. `/pulse` is pure analytics. `/` is a kitchen-sink hybrid (marketing + member status + trust pulse + governance summary + StatsBar).',
  '- The sibling tasks in this sprint ("Apply for Jupiter Community Tag verification" + "Upgrade public stats surface") are pushing `/` and a new `/stats` route into Jupiter-reviewer-friendly proof surfaces. The dashboard revamp lives one layer ABOVE that work.',
  '- Outsiders (prospective members, $ORG buyers, Jupiter reviewers) need a richer narrative surface than the numbers-only `/stats` to evaluate this community. Members need a real home that surfaces sprint progress, AI summaries, contributor activity, and community testimonials.',
  '- This is also the SaaS template. Every line of UI must be theme-able for future tenants from day one (without buying tenant infra yet).',
  '- Goal: a route that screams "alive, fun, professional, community-driven Solana SaaS" — closer to Jupiter than to Linear, closer to MonkeDAO than to Aragon. NOT pump.fun chaos. NOT enterprise SaaS coldness.',
  '',
  '**LOCKED DECISIONS (from brainstorm):**',
  '1. Route: NEW `/dashboard`, post-login default redirect target',
  '2. AI features: A + B + C only — A) new per-sprint AI summary (cron-cached on sprint row), B) reuse existing `GovernanceSummaryCard`, C) deterministic 7-day "activity digest" (SQL only, no LLM)',
  "3. Section spine: Sprint-centric (sprint is the page's organizing principle)",
  '4. Multi-tenant: Theme-READY, not theme-ACTIVE. Single typed config object. NO tenant table, NO admin UI, NO tenant detection in this task.',
  '5. "Alive" in pixels: Level 2 (polled). 60s polling refresh + presence count + activity ticker + ticking countdown + freshness dots. NO WebSockets.',
  '6. Anonymous behavior: full public dashboard. Personal sections become "Join {community}" invitation cards. Prominent "Join {community}" CTAs in masthead + footer.',
  '7. Testimonials: full v1 — Supabase table, give-feedback modal (stars + text), admin approval queue, points award on approval, manual-nav carousel (NO autoplay).',
  '8. Tonal dial: Confident-disciplined. Vibrant Solana-community palette + Fraunces hero + micro-celebrations + count-up motion. NO emojis. NO meme-coin chaos.',
  '',
  '**SECTION LIST (the new `/dashboard`):**',
  '',
  '1. **Masthead** — tenant logo + community name + live indicator ("12 active now / last activity 30s ago"). Anonymous: "Join {community}" pill in top-right.',
  '2. **Sprint hero** — full-width branded surface (Fraunces display, accent-colored). Sprint phase + ticking countdown. AI summary card (A). Progress meter (X of Y tasks done). Top 3 contributors this sprint (avatars + names + XP earned). "View sprint" → `/sprints/[id]`.',
  '3. **Stat strip** — 4 deterministic live numbers, count-up animation, 60s polling. Active members 24h / Points distributed THIS sprint / Tasks shipped THIS sprint / Open proposals.',
  '4. **Two-column** — LEFT (member): "My contributions this sprint" + next-action CTA. LEFT (anonymous): "Join {community}" invitation card with 3-bullet why-join. RIGHT: `GovernanceSummaryCard` (B) compact + "Open governance" link.',
  '5. **Activity digest** (C) — last 7 days, deterministic SQL. Up to 8 mixed-type entries (task done, proposal phase flip, member joined, milestone hit, sprint started). Freshness dots (<5min green pulse, <1h amber, older neutral).',
  '6. **Testimonials rail** — manual-nav carousel, 3 cards desktop / 1 mobile. Star rating, quote, avatar + name + role. Prev/next arrows + named-dot pagination. "Share your story" CTA (anonymous: "Sign in to share").',
  '7. **Quiet footer** — tenant socials + links to `/pulse`, `/stats`, `/sprints`. Anonymous: prominent "Join {community}" repeat. Attribution: "Powered by Organic" (when tenant != Organic).',
  '',
  '**FILES TO CREATE:**',
  '',
  '*Routes + components:*',
  '- `src/app/[locale]/dashboard/page.tsx`',
  '- `src/components/dashboard/dashboard-masthead.tsx`',
  '- `src/components/dashboard/sprint-hero.tsx`',
  '- `src/components/dashboard/sprint-ai-summary.tsx`',
  '- `src/components/dashboard/dashboard-stat-strip.tsx`',
  '- `src/components/dashboard/my-contributions.tsx`',
  '- `src/components/dashboard/anonymous-join-card.tsx`',
  '- `src/components/dashboard/activity-digest.tsx`',
  '- `src/components/dashboard/testimonials-rail.tsx`',
  '- `src/components/dashboard/give-feedback-modal.tsx`',
  '- `src/components/dashboard/dashboard-footer.tsx`',
  '- `src/components/dashboard/live-indicator.tsx`',
  '',
  '*Tenant branding (theme-ready):*',
  '- `src/lib/tenant/types.ts` — `TenantBranding` interface',
  "- `src/lib/tenant/branding.ts` — `getBranding()` returning Organic's values today; future swap point for multi-tenant",
  '',
  '*Feature hooks:*',
  '- `src/features/dashboard/use-dashboard-data.ts` (single SWR hook)',
  '- `src/features/dashboard/use-presence.ts`',
  '- `src/features/dashboard/use-sprint-summary.ts`',
  '- `src/features/testimonials/types.ts`',
  '- `src/features/testimonials/use-testimonials.ts`',
  '- `src/features/testimonials/use-submit-feedback.ts`',
  '',
  '*API routes:*',
  '- `src/app/api/dashboard/route.ts` (aggregate dashboard data)',
  '- `src/app/api/presence/route.ts` (active-in-last-5-min count)',
  '- `src/app/api/sprint-summary/[sprintId]/route.ts` (read cached AI summary)',
  '- `src/app/api/sprint-summary/regenerate/route.ts` (admin/state-machine-triggered regen)',
  '- `src/app/api/testimonials/route.ts` (list approved + member submit)',
  '- `src/app/api/testimonials/admin/route.ts` (admin moderate)',
  '- `src/app/api/cron/sprint-summary/route.ts` (Vercel cron, every 6h, `CRON_SECRET`-gated)',
  '',
  '*Migration + tests + script:*',
  '- `supabase/migrations/2026XXXX_dashboard_schema.sql`',
  '- `tests/api/dashboard.test.ts`',
  '- `tests/api/testimonials.test.ts`',
  '- `tests/security/testimonials-rls.test.ts`',
  '',
  '**FILES TO MODIFY:**',
  '- `src/app/[locale]/login/page.tsx` — post-login redirect target → `/dashboard`',
  '- `src/components/sidebar/*` — add `/dashboard` nav item (Pulse label stays)',
  '- `messages/en.json` + `messages/pt-PT.json` + `messages/zh-CN.json` — translation keys for ALL new strings',
  '- `next.config.js` (or `vercel.json`) — declare cron schedule for `/api/cron/sprint-summary`',
  '- `src/middleware.ts` — anonymous still allowed at `/dashboard` (no redirect)',
  '',
  '**FILES TO REVIEW BUT NOT MODIFY:**',
  '- `src/app/[locale]/pulse/page.tsx` — mirror `dynamic(...)` import patterns',
  '- `src/app/[locale]/page.tsx` — sibling public-stats task is also editing this; coordinate',
  '- `src/components/dashboard/stats-bar.tsx` — pattern reference (sibling task adds `variant="hero"`)',
  '- `src/components/analytics/governance-summary-card.tsx` — reuse compact variant in section 4',
  '',
  '**DATABASE SCHEMA:**',
  '',
  '```sql',
  '-- AI summary cached on sprints',
  'ALTER TABLE sprints',
  '  ADD COLUMN ai_summary_text TEXT,',
  '  ADD COLUMN ai_summary_themes TEXT[],',
  '  ADD COLUMN ai_summary_generated_at TIMESTAMPTZ,',
  '  ADD COLUMN ai_summary_model TEXT;',
  '',
  '-- Testimonials',
  'CREATE TABLE testimonials (',
  '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,',
  '  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),',
  '  quote TEXT NOT NULL CHECK (char_length(quote) BETWEEN 10 AND 500),',
  "  status TEXT NOT NULL DEFAULT 'pending'",
  "    CHECK (status IN ('pending','approved','rejected')),",
  '  approved_by UUID REFERENCES user_profiles(id),',
  '  approved_at TIMESTAMPTZ,',
  '  points_awarded INTEGER DEFAULT 0,',
  '  created_at TIMESTAMPTZ DEFAULT NOW(),',
  '  updated_at TIMESTAMPTZ DEFAULT NOW()',
  ');',
  '',
  'CREATE INDEX testimonials_status_created_idx ON testimonials(status, created_at DESC);',
  'ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;',
  '',
  '-- RLS rules:',
  "-- - Anyone (anon + authed) can SELECT WHERE status = 'approved'",
  "-- - Authed can INSERT WHERE member_id = auth.uid() AND status = 'pending'",
  '-- - Service role only for UPDATE/DELETE',
  "-- - Authed can SELECT their own pending submissions but no one else's",
  '```',
  '',
  '**AI SPRINT SUMMARY INFRA:**',
  '- Source data: sprint metadata + tasks in sprint (statuses, points, assignees, % complete)',
  '- Cron: `/api/cron/sprint-summary` runs every 6h via Vercel cron, gated on `CRON_SECRET` header. ALSO regenerate when sprint status flips (`active → review → settlement` etc.) — fire-and-forget POST from existing sprint state-machine code.',
  '- Model: `claude-haiku-4-5` (cheap + fast). Use Anthropic SDK with prompt caching on the system prompt + sprint shape. See `claude-api` skill.',
  '- Output: 2-3 short paragraphs (max 600 chars total) + 3-4 themes (string[]) + model name + generated_at, persisted on the `sprints` row.',
  '- Fallback: if AI call fails OR columns are null, render deterministic text: "{sprint name} is in {phase}. {N} of {M} tasks complete. Top contributors: {x, y, z}."',
  '- Cost: ~$0.001 per regen × 1 active sprint × 4/day ≈ $0.12/month. Negligible.',
  '',
  '**LIVE PRESENCE + ACTIVITY TICKER:**',
  '- `/api/presence` returns `{ active_count, last_activity_at }` from `activity_log` (distinct user_ids in last 5 min)',
  '- 60s SWR polling client-side (`refreshInterval: 60_000`)',
  '- Activity ticker in masthead: existing `useActivityFeed`, slice top 1-3, animate item replacements with `animate-fade-up`',
  '- Sprint countdown: client-side `setInterval(60_000)` to re-render minute-granularity countdown',
  '- Freshness dots on activity digest items: pure CSS using existing timestamps',
  '',
  '**TESTIMONIALS FEATURE FLOW:**',
  '',
  '*Submission (member):*',
  '1. Click "Share your story" CTA on dashboard',
  '2. shadcn `Dialog` opens — 5-star input + textarea (Zod: rating 1-5, quote 10-500 chars)',
  "3. POST `/api/testimonials` → server validates auth + Zod → INSERT `status='pending'`",
  '4. Toast: "Submitted. An admin will review and approve."',
  '',
  '*Approval (admin):*',
  '- Add a "Testimonials moderation" tab under existing `/admin`',
  '- List pending: member name + rating + quote + submitted-at',
  '- Approve: `status=\'approved\'`, `approved_by`, `approved_at`, `points_awarded=50`. Then call existing reputation service to grant 50 XP. Then send notification ("Your feedback was approved! +50 points").',
  "- Reject: `status='rejected'`, no points",
  '',
  '*Display (dashboard):*',
  '- `/api/testimonials` returns up to 10 most recent approved',
  '- Carousel: 3 cards desktop / 1 card mobile, manual nav, named-dot pagination, **NO autoplay** (WCAG)',
  '- Card: stars, quote, member avatar (or initial circle from profile), name, role/sprint context',
  '',
  '*Anti-abuse:* rate-limit 1 submission per member per 30 days. 50 points (between Smart-Like 30 and Twitter 40-60).',
  '',
  '**MULTI-TENANT BRANDING CONFIG (theme-ready, not theme-active):**',
  '',
  '```ts',
  '// src/lib/tenant/types.ts',
  'export interface TenantBranding {',
  '  communityName: string;',
  '  communityHandle: string | null;',
  '  logoUrl: string;',
  '  heroImageUrl: string | null;',
  '  accentPrimary: string;       // HSL e.g. "28 100% 50%"',
  '  accentSecondary: string | null;',
  '  tagline: string | null;',
  '  footerNote: string | null;',
  '  socials: {',
  '    twitter: string | null;',
  '    telegram: string | null;',
  '    discord: string | null;',
  '  };',
  '}',
  '',
  '// src/lib/tenant/branding.ts',
  'const ORGANIC_BRANDING: TenantBranding = {',
  "  communityName: 'Organic',",
  "  communityHandle: '@organic_bonk',",
  "  logoUrl: '/organic-logo.png',",
  '  heroImageUrl: null,',
  "  accentPrimary: '28 100% 50%',     // terracotta",
  "  accentSecondary: '60 100% 60%',   // yellow",
  "  tagline: 'A community building, governing, rewarding — together.',",
  "  footerNote: 'Powered by Organic',",
  '  socials: {',
  "    twitter: 'https://x.com/organic_bonk',",
  '    telegram: null,',
  '    discord: null,',
  '  },',
  '};',
  '',
  'export async function getBranding(): Promise<TenantBranding> {',
  '  return ORGANIC_BRANDING;',
  '}',
  '```',
  '',
  '**Discipline rule:** NO "Organic" string literal anywhere in `src/app/[locale]/dashboard/**` or `src/components/dashboard/**`. NO `/organic-logo.png` import. NO hex literals. All copy + assets read from `getBranding()`. Search-grep proof in CR.',
  '',
  '**ACCEPTANCE CRITERIA:**',
  '- ✅ `/dashboard` renders for both authenticated AND anonymous users (no redirect)',
  '- ✅ Anonymous: masthead + "Join {community}" pill + sprint hero + stat strip + invitation-to-join card (replacing my-contributions) + governance summary + activity digest + testimonials + footer with "Join {community}" CTA',
  '- ✅ Authenticated: same + my-contributions card replaces invitation',
  '- ✅ Sprint AI summary appears in hero, generated by cron, deterministic fallback when missing',
  '- ✅ Live presence count updates every 60s (no WebSocket)',
  '- ✅ Sprint countdown ticks at minute granularity client-side',
  '- ✅ Stat strip: 4 numbers, count-up animation, 60s polling',
  '- ✅ Activity digest: last 7 days, max 8 entries, freshness dots',
  '- ✅ Testimonials: 3 desktop / 1 mobile, manual nav, no autoplay, named-dot pagination',
  '- ✅ Give-feedback modal validates (Zod), submits, shows toast',
  '- ✅ Admin approval awards 50 XP via existing reputation service + sends notification',
  '- ✅ `git grep "Organic" src/app/\\[locale\\]/dashboard src/components/dashboard` returns zero hits',
  '- ✅ All colors use design tokens or `accentPrimary`/`accentSecondary` from branding — no hex literals',
  '- ✅ Translation keys for ALL new strings in en, pt-PT, zh-CN',
  '- ✅ Mobile QA at 320, 375, 414, 768, 1280, 1920 — no overflow',
  '- ✅ Lighthouse a11y ≥ 95, contrast OK in light + dark',
  '- ✅ Post-login redirect → `/dashboard`',
  '- ✅ Sidebar nav has `/dashboard` entry',
  '- ✅ `npm run lint` clean, `npm run build` green, `npx vitest run` passes new tests',
  '- ✅ RLS test: anonymous can SELECT approved testimonials, cannot SELECT pending; authenticated can INSERT only with their own member_id',
  '- ✅ `/api/cron/sprint-summary` requires `CRON_SECRET` (curl without it → 401)',
  '- ✅ Visual review: feels closer to Jupiter than to Linear',
  '',
  '**OUT OF SCOPE (do NOT do these in this task):**',
  '- ❌ Tenant branding admin UI (separate follow-up task — `/admin/branding` form + `tenant_branding` table)',
  '- ❌ Multi-tenant routing / detection / RLS (separate sprint)',
  '- ❌ Supabase Realtime / WebSockets (Level 3 alive — follow-up)',
  '- ❌ True LLM activity digest (option D from brainstorm)',
  '- ❌ Personal nudge cards (E), sentiment AI (F), proposal momentum AI (G), AI chat (H)',
  '- ❌ Full Organic rebrand (separate)',
  '- ❌ Refactor of `/` or `/pulse` (sibling public-stats task handles `/`)',
  '- ❌ Photo upload for testimonials (use member avatar from profile)',
  '- ❌ Translation pipeline for member-written testimonial content',
  '',
  '**HOW TO SUBMIT:** PR link with all of the above. Include screenshots of (a) authenticated dashboard at 1440px, (b) anonymous dashboard at 1440px showing "Join Organic" CTAs, (c) testimonials carousel desktop + mobile, (d) give-feedback modal, (e) sprint hero with AI summary populated.',
  '',
  '**VERIFICATION:**',
  '- `npm run dev` → visit `/dashboard` logged out → all 7 sections render → "Join Organic" CTA visible in masthead + footer',
  '- Sign in → my-contributions replaces invitation card',
  '- Click "Share your story" → modal → submit → toast confirms pending',
  '- As admin → `/admin/testimonials` → approve → testimonial appears in carousel within 60s polling cycle → submitter sees +50 points',
  '- Trigger cron manually → sprint AI summary appears in hero',
  '- `git grep "Organic" src/app/\\[locale\\]/dashboard src/components/dashboard` → zero hits',
  '- Mobile viewports 375 + 768 → no overflow',
  '- Lighthouse `/dashboard` → ≥ 90 perf, ≥ 95 a11y',
  '',
  '**FOLLOW-UP TASKS (next sprint):**',
  '1. Tenant branding admin UI (`/admin/branding` form + `tenant_branding` Supabase table)',
  '2. Multi-tenant routing + tenant detection (subdomain or path)',
  '3. Supabase Realtime upgrade (Level 3 alive) if Level 2 polling is insufficient',
  '4. Full Organic rebrand',
  '5. True LLM activity digest (D)',
  '6. Personal nudge cards (E)',
  '7. Photo upload for testimonials',
  '8. AI sprint summaries in alternate languages (next-intl-aware prompt)',
  '',
  '**RESEARCH REFERENCES:**',
  '- Solana community surfaces (BONK / MonkeDAO / Jupiter) — solanacompass.com/projects/monkedao',
  '- Pump.fun design balance ("vibrant meme aesthetics + professional UX")',
  '- Multi-tenant DAO branding direction — Tally, Snapshot, Aragon all moving toward per-tenant theming',
  '- Testimonial carousel best practices — manual nav > autoplay (WCAG), 3-card display, named-dot pagination',
  '',
  '**DEPENDS ON / RELATED:**',
  '- Pairs with the **Apply for Jupiter Community Tag verification** task and the **Upgrade public stats surface (Jupiter signal)** task in this sprint. Coordinate `/` edits with the public-stats task — that task adds `<StatsBar variant="hero">` above the fold on `/`. The dashboard task should NOT also touch `/`.',
  '',
  '**POINTS:** 750 (~5 days solo dev). Largest task in this sprint. Breakdown: branding config (0.25d) + dashboard route + 7 sections (1d) + AI summary infra (0.75d) + testimonials full flow (1d) + presence/ticker/countdown (0.5d) + anonymous variants (0.25d) + translations (0.25d) + tests (0.5d) + mobile/a11y/Lighthouse (0.25d) + buffer (0.25d).',
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

async function insertTask(orgId: string, adminId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('tasks')
    .select('id')
    .eq('sprint_id', SPRINT_ID)
    .eq('title', TASK_TITLE)
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`  Task already exists: ${TASK_TITLE}`);
    return;
  }

  const { error } = await supabase.from('tasks').insert({
    org_id: orgId,
    sprint_id: SPRINT_ID,
    title: TASK_TITLE,
    description: TASK_DESCRIPTION,
    status: 'todo',
    points: 750,
    base_points: 750,
    priority: 'high',
    task_type: 'development',
    labels: ['dev', 'dashboard', 'multi-tenant', 'feature', 'jupiter'],
    is_team_task: false,
    max_assignees: 1,
    assignee_id: adminId,
    created_by: adminId,
  });

  if (error) {
    console.error('  Failed to insert task:', error.message);
    process.exit(1);
  }
  console.log(`  Task created: ${TASK_TITLE}`);
}

async function main(): Promise<void> {
  console.log(`Adding dashboard-revamp task to sprint ${SPRINT_ID}...\n`);
  const org = await getOrg();
  const adminId = await getAdminUserId();
  await insertTask(org.id, adminId);
  console.log('\n✅ Done.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Unexpected error';
  console.error('Fatal:', message);
  process.exit(1);
});
