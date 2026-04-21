# Mobile UX Audit + QA Runbook Revamp

**Created:** 2026-04-21
**Branch:** `fix/app-audit-iter1` (audit is read-only; runbook revamp is doc edits)
**Status:** Planned — not implemented
**Owner:** TBD

---

## Goal

Two deliverables:

- **Part A — QA Runbook Revamp.** Rewrite `docs/qa-runbook.md` to reflect the live production app. The existing runbook predates recent shipping (points economy, easter campaign, Pulse, launchpad, etc.). Outdated runbook = unreliable mobile audit baseline.
- **Part B — Mobile UX/UI Audit.** Playwright-headed audit of every production mobile route. Score each screen 1–10 across 8 axes, benchmarked against Linear, Notion, Vercel on mobile. Explicit additional lens: **organic-behavior incentives** and **bot-friction signals**.

Both deliverables land as committed markdown in `docs/`. No app code changes in this plan — findings produce follow-up fix plans.

---

## Part A — QA Runbook Revamp

### Scope

Read the current `docs/qa-runbook.md`, diff against live production routes and features, rewrite to match reality.

### Procedure

1. **Inventory live routes.** Walk `src/app/[locale]/` to produce the authoritative route list. Include `/pulse`, `/sprints`, `/tasks`, `/proposals`, `/ideas`, `/community`, `/community/[id]`, `/treasury`, `/vault`, `/earn`, `/marketplace`, `/admin`, `/profile`, `/members`, `/activity`, `/launchpad` (if present), easter pages, etc.
2. **Inventory features that need QA steps**, by walking `src/features/*`:
   - auth, wallet-linking, solana token-holder checks
   - tasks (including team tasks), submissions, reviews, disputes
   - sprints (start/complete, drag-drop, velocity)
   - proposals (wizard, voting, results, versions)
   - ideas (incubator, promotion to proposal)
   - posts (feed, post creation, points costs, flagging)
   - comments (no translate for now)
   - gamification (XP, points, levels, badges, referrals)
   - treasury (balances, allocations)
   - easter campaign (XP eggs, golden egg)
   - translations (post/proposal/idea/task once shipped)
   - admin (settings, users, submissions, rewards)
   - notifications, analytics, Pulse, membership / access controls
3. **For each route + feature**, write:
   - Pre-req state (seeded user, role, wallet, points balance)
   - Primary happy-path steps
   - Edge cases (empty state, loading state, error state, locked state, mobile-only behavior)
   - Cross-check for i18n (EN + ZH)
   - Test account to use: `claude-test@organic-dao.dev` / `OrganicTest2026!`
4. **Organize by user role**: public visitor, authenticated member, admin.
5. **Keep it living.** Each entry gets a line: *"Last verified: 2026-04-21"* so drift is visible.

### Deliverable

Rewrite of `docs/qa-runbook.md`. Keep old file out of git history by overwriting — use PR body to summarize removed/added sections. Also add a short `docs/qa-runbook-change-log.md` with the date + what changed, to make future revamps easier.

### Verification

- Open the new runbook, cross-check ten random flows by running them in the headed browser. Fix anything that doesn't match.
- Confirm every sidebar/nav entry in `src/components/layout/nav-config.ts` has a corresponding runbook section.

---

## Part B — Mobile UX/UI Audit

### Viewports

Primary: iPhone 13 (390×844). Secondary: Pixel 7 (412×915). Tertiary: small Android (360×640) for spot-checks.

Use Playwright's built-in device descriptors. Headed. Real auth state via stored session.

### Audit procedure

For each route in the **new** `qa-runbook.md`:

1. Load route on iPhone 13 viewport. Capture full-page screenshot.
2. Interact with all visible primary actions. Capture action-state screenshots (hover, active, modal open).
3. Score the screen 1–10 on each axis below.
4. Flag any issue that is S0 (broken/blocking), S1 (bad UX), S2 (polish).

### Scoring axes (1–10 each)

1. **Hierarchy** — does the most important action read first? Scale contrast and weight used well?
2. **Touch targets** — buttons ≥44×44pt? No edge-of-screen taps that compete with system gestures?
3. **Density** — information-appropriate; not cramped, not wasteful?
4. **Copy clarity** — labels and empty-state copy specific, scannable, localized?
5. **Motion** — purposeful, respects reduced-motion, no jank on scroll?
6. **States** — loading, empty, error, success all present and credible?
7. **Organic-behavior incentives** — does the screen visibly reward authentic activity? (E.g., clear XP/points feedback, streaks, referral hooks, no dead-ends after completing an action.)
8. **Bot-friction signals** — does the screen include friction against automation without punishing humans? (E.g., rate limits surfaced humanely, captchas or wallet-signature gates for cheap-to-spam actions, post-cost economics visible, flagging/reporting accessible.)

### Benchmark comparison

Per screen, add a 1-line comparison: *"Linear's equivalent uses X; we use Y; gap = Z"* or a similar benchmark line for Notion / Vercel. Only reference real patterns from their mobile UIs.

### Organic-behavior / anti-bot deep-dive (cross-cutting)

Pull these out as their own section:

- **Where does the app reward organic behavior?** (posts earning points, engagement earning XP, badges, streaks, referral, sprint completion, proposal votes.)
- **Where could a bot farm value cheaply?** (likes, comments, follows, easy posts, repeated voting, referral loops.)
- **Existing friction:** wallet-linked identity, organic_id gating, post creation cost, DeepL/translate cost bounds, rate limits, flagging pipeline.
- **Recommended friction to add:** TBD — this is the output of the audit.

### Deliverable

New file `docs/plans/2026-04-21-mobile-audit-report.md` with:

- Per-screen scorecards (one compact table per screen).
- Cross-cutting summary: average scores per axis, top 10 S0/S1 issues, top 5 bot-friction gaps.
- Prioritized follow-up list: which items go to `qa-fixer`, which to `prototype-executor` revamp, which to new feature work.

### Tooling

Use the Playwright CLI via the `playwright-cli` skill. Example invocation to capture a route:

```bash
# Example — adapt per the skill's actual interface
playwright-cli nav --device "iPhone 13" --url "https://organichub.fun/en/pulse" --screenshot pulse-iphone13.png
```

Store artifacts under `docs/images/mobile-audit-2026-04-21/`.

### Verification

- Every route in the new runbook has a scorecard.
- Every S0 flag has a screenshot and a suggested fix owner (qa-fixer vs. revamp).
- Final report compiles a single ranked backlog.

---

## Risks

- **Audit fatigue** — scoring every route is long. Batch by domain (e.g., Sprints day 1, Proposals day 2) to keep reviewer fresh.
- **Stale screenshots** — app ships weekly. Date-stamp every artifact.
- **Benchmarks drift** — Linear/Notion change; fix benchmarks by date too ("as of 2026-04-21 Linear iOS app").
- **Not touching auth/wallet/RLS** — this is audit + docs only. Any flagged bug spawns its own fix plan.

---

## Estimated effort

- Part A (runbook): 0.5 day
- Part B (audit + report): 1–2 days

## Next step after this plan

If both deliverables complete, the audit report directly feeds (a) `qa-fixer` for S0/S1 bugs and (b) `prototype-executor` for revamp work. Do not merge revamps into this branch — spin new branches per CLAUDE.md phase convention.
