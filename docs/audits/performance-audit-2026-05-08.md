# Performance Audit — 2026-05-08

## Summary

**Top 3 bottlenecks:**
1. `tasks/[id]` page ships 334 kB first-load JS because the entire page is a single `'use client'` component (963 lines) with all children statically imported — nothing beyond `TaskEditForm` is lazy-loaded.
2. Dashboard server route runs `loadSprintHero()` sequentially before launching the remaining five parallel loads, adding one full Supabase round-trip to every `/api/dashboard` response.
3. `analytics/route.ts` fetches unbounded `votes`, `task_submissions`, `comments`, and `activity_log` rows in parallel for a 30-day window with no `.limit()` guard; under moderate traffic these can return thousands of rows.

**Estimated highest-impact fixes (top 5):**
1. Lazy-load `TaskCommentsSection`, `TaskSubmissionsSection`, `SubtaskList`, and `DependencyPicker` inside `tasks/[id]/page.tsx` — these are below-the-fold and drive the 334 kB budget.
2. Merge `loadSprintHero()` into the `Promise.all` in `/api/dashboard` — eliminates a sequential waterfall on every dashboard load.
3. Add `.limit()` caps to the four unbounded analytics trust-window queries in `/api/analytics/route.ts`.
4. Replace the second full-table `user_profiles` scan in `/api/members` (for `role_counts`) with a Postgres aggregate RPC or a `group by role` query.
5. Add a composite index on `posts(is_pinned DESC, likes_count DESC, created_at DESC)` for the `popular` sort path that currently has no covering index.

---

## 1. Bundle Size

Build was run successfully (`npm run build`). All sizes are first-load JS (gzipped by Next.js reporting).

### Per-route first-load JS

| Route | First Load JS | Route-only chunk |
|---|---|---|
| `/[locale]/tasks/[id]` | **334 kB** | 29.3 kB |
| `/[locale]/proposals/[id]` | **326 kB** | 7.05 kB |
| `/[locale]/admin/settings` | **316 kB** | 20 kB |
| `/[locale]/sprints` | **316 kB** | 12 kB |
| `/[locale]/proposals` | **316 kB** | 5.16 kB |
| `/[locale]/proposals/new` | **312 kB** | 1.83 kB |
| `/[locale]/community/[id]` | **317 kB** | 5.32 kB |
| `/[locale]/profile` | **318 kB** | 15.2 kB |
| `/[locale]/disputes/[id]` | **321 kB** | 13.3 kB |
| `/[locale]/dashboard` | **312 kB** | 15.8 kB |
| `/[locale]` (home) | **315 kB** | 14.8 kB |
| `/[locale]/leaderboard` | 89.7 kB | 180 B |
| `/[locale]/members` | 89.7 kB | 180 B |

Shared baseline for all routes: **89.5 kB** (chunks `2117-...` 31.9 kB + `fd9d1056-...` 53.6 kB). The 89.5 kB baseline is already at the upper edge of the 80 kB target for landing pages but acceptable for an authenticated app.

**Bloat budget target (web rules):** App pages < 300 kB. Five routes breach this.

### Bloat causes and fixes

**`tasks/[id]/page.tsx` — 334 kB**
- `src/app/[locale]/tasks/[id]/page.tsx:1` — entire 963-line page is `'use client'`, pulling all children into the initial bundle.
- `src/app/[locale]/tasks/[id]/page.tsx:28` — `TaskEditForm` is already dynamic (`ssr: false`). However `TaskCommentsSection`, `TaskSubmissionsSection`, `SubtaskList`, `DependencyPicker`, `TaskContributorsModal`, `TaskAssignModal`, `TaskDeleteConfirmModal`, and `TaskSubmissionForm` are all statically imported despite being below the fold or behind interaction gates.
- Fix: wrap each of the eight components listed above in `dynamic(() => import(...), { ssr: false })`. Estimated reduction: 8–12 kB from route chunk, but more importantly removes their transitive deps from the initial parse cost.

**`proposals/[id]/page.tsx` — 326 kB**
- `src/app/[locale]/proposals/[id]/page.tsx:1` — `'use client'` at top level. `VotingPanel`, `VoteResults`, `AdminVotingControls`, `DelegatedPowerBadge`, `DelegationPanel`, `DelegationInfo` are already dynamic (lines 55–79). Good.
- `src/app/[locale]/proposals/[id]/page.tsx:43` — `ProposalSections` and `StageStepper` are statically imported. If these contain the markdown renderer or any rich-text library, they inflate the bundle. Audit their transitive deps.
- `src/app/[locale]/proposals/[id]/page.tsx:31` — `date-fns` imported directly at the top; only `formatDistanceToNow` and `format` are used. Tree-shaking should handle this but confirm with `ANALYZE=true`.

**`/[locale]` (home) — 315 kB**
- `src/app/[locale]/page.tsx:26` — `GovernanceSummaryCard` is statically imported on the home page even though it is dynamically imported on the dashboard. This is inconsistent; make it `dynamic` here too.
- `src/app/[locale]/page.tsx:56–59` — four TanStack Query hooks (`useSprints`, `useProposals`, `useLeaderboard`, `useActivityFeed`) fire in parallel on mount. This is correct for parallelism but means four separate API calls on the initial client hydration. Consider a combined `/api/home-feed` endpoint if latency becomes an issue.

**`dashboard/page.tsx` — 312 kB**
- `src/app/[locale]/dashboard/page.tsx:12` — `JupiterSwapEmbed` is statically imported and always rendered when `TOKEN_CONFIG.mint` is truthy (line 87). This embed loads a third-party `<script>` injected via `useEffect` (`src/components/dashboard/jupiter-swap-embed.tsx:70`) for Jupiter Terminal. The component itself is only 5 kB but it immediately injects `https://terminal.jup.ag/main-v2.js` (large, third-party). Lazy-load the component itself with `dynamic` so the script injection is deferred.

**`sprints/page.tsx` — 316 kB**
- `src/app/[locale]/sprints/page.tsx:1` — `'use client'`, 912 lines. `SprintBoardView`, `SprintListView`, `SprintTimeline`, `SprintCreateModal`, `SprintStartDialog`, `SprintCompleteDialog` are all statically imported (`src/app/[locale]/sprints/page.tsx:35–42`). The board and timeline views in particular are only shown after a tab switch. Lazy-load `SprintTimeline` and `SprintCreateModal`/`SprintStartDialog`/`SprintCompleteDialog` (modal components — never visible on initial load).

**`pulse/page.tsx` — 304 kB**
- `src/app/[locale]/pulse/page.tsx:12` — `TokenChart` is statically imported, despite other analytics charts on the same page being lazy-loaded (lines 27–54). Apply `dynamic` to `TokenChart` consistently.

---

## 2. N+1 Queries

No true N+1 loops (queries inside a `for` loop over a result set) were found in the API routes. The codebase consistently uses batch-fetch-then-map with `Promise.all` and `.in()` for actor enrichment. However, two structural inefficiencies approximate an N+1 in practice:

| Route | Pattern | Suggested fix |
|---|---|---|
| `GET /api/members` | Second full `user_profiles` scan to compute `role_counts` (`route.ts:59–76`). Fetches all visible profiles (potentially hundreds of rows) purely to count by role, as a separate query after the paginated main query. | Replace with a single aggregate: `SELECT role, count(*) FROM user_profiles WHERE profile_visible = true AND role IS NOT NULL GROUP BY role`. Can be done as a parallel query alongside the main paginated fetch. |
| `GET /api/dashboard` → `loadSprintHero()` | Inside `loadSprintHero()` (`dashboard/route.ts:62–65`), after fetching the active sprint, a second query immediately fetches all sprint tasks, then a third fetches profiles for assignees. These three queries are sequential inside the function. The function itself is called with a sequential `await` before the outer `Promise.all` (`route.ts:249`), blocking stats + digest + contributions from starting. | Hoist `loadSprintHero()` into the outer `Promise.all` alongside `loadStatStrip`, `loadActivityDigest`, etc. The `sprintId` dependency for `loadMyContributions` and `loadStatStrip` can be handled by passing the sprint object: `const [sprintResult, digestResult, brandingResult, tokenResult] = await Promise.all([loadSprintHero(), loadActivityDigest(), getBranding(), getTokenTrust()])`. Then derive `sprintId` from `sprintResult` and run `loadStatStrip` + `loadMyContributions` in a second parallel batch. |

---

## 3. Pagination Gaps

| Endpoint | Risk | Suggested limit |
|---|---|---|
| `GET /api/tasks/assignees` | Returns all users with an `organic_id` and eligible role — no `.limit()`. As membership grows this is an unbounded list fetch (`route.ts:20–25`). | Add `.limit(500)` as a safety cap; the UI only needs enough for a dropdown. |
| `GET /api/tasks/templates` | Returns all templates without limit (`templates/route.ts:24–27`). Low risk today but grows linearly. | Add `.limit(200)`. |
| `GET /api/analytics` (trust-window queries) | `votes`, `task_submissions`, `comments`, and `activity_log` are queried with only a `gte` date filter and no `.limit()` (`route.ts:76–79`). Over 30 days these tables accumulate thousands of rows, all fetched client-side for in-memory aggregation. | Either push the distinct-count aggregation into Postgres via RPC, or add `.limit(5000)` as a guardrail with a comment that it affects only display accuracy at extreme scale. |
| `GET /api/easter/leaderboard` | Fetches all rows from `golden_eggs` with no limit (`leaderboard/route.ts:34–37`). A one-shot seasonal table, low immediate risk, but should be capped. | Add `.limit(1000)`. |
| Personal analytics — `activity_log` (`/api/analytics/personal`) | Fetches up to 365 days of `activity_log` rows for a single user with no limit (`personal/route.ts:54–58`). For power users this could be thousands of rows. | Add `.limit(2000)` since the heatmap renders at most 365 data points. |

---

## 4. Missing Indexes

The codebase has extensive index coverage from several dedicated migrations. The following gaps remain:

| Table | Column(s) | Query pattern | Migration sketch |
|---|---|---|---|
| `posts` | `(likes_count DESC, created_at DESC)` filtered on `status = 'published'` | `/api/posts` `popular` sort: `.order('likes_count', {ascending:false}).order('created_at',{ascending:false})`. Existing `idx_posts_pinned_created` covers only the `new` sort path. | `CREATE INDEX IF NOT EXISTS idx_posts_popular ON posts (likes_count DESC, created_at DESC) WHERE status = 'published' AND removed_at IS NULL;` |
| `posts` | `(post_type, created_at DESC)` filtered on `status = 'published'` | `/api/posts` `type` filter: `.eq('post_type', type)`. No index on `post_type` in the posts migration. | `CREATE INDEX IF NOT EXISTS idx_posts_type_created ON posts (post_type, created_at DESC) WHERE status = 'published';` |
| `activity_log` | `(event_type, created_at DESC)` | `/api/analytics/route.ts` and digest queries filter by `event_type` in application code after fetching; pushing to DB requires an index. Also the BRIN on `created_at` alone does not accelerate `event_type` filter. | `CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON activity_log (event_type, created_at DESC);` |
| `xp_events` | `(source_type, user_id, created_at DESC)` | If analytics RPCs filter by `source_type`, the composite `(user_id, created_at DESC)` index (`idx_xp_events_user_created`) is not used for `source_type` queries. Verify RPC internals — index may already cover use case. Low priority. | `CREATE INDEX IF NOT EXISTS idx_xp_events_source_user ON xp_events (source_type, user_id, created_at DESC);` |
| `user_profiles` | `(profile_visible, role, total_points DESC)` | `/api/members` main query: `.eq('profile_visible', true).eq('role', role).order('total_points', {ascending:false})`. Current indexes are separate: `idx_user_profiles_visible`, `idx_user_profiles_role`, `idx_user_profiles_points`. Postgres cannot use all three for the combined query without a composite. | `CREATE INDEX IF NOT EXISTS idx_user_profiles_members_list ON user_profiles (profile_visible, role, total_points DESC) WHERE profile_visible = true;` |

---

## 5. Core Web Vitals Risks per Page

### `/[locale]` — Home (high traffic)

- **LCP risk** (`src/app/[locale]/page.tsx:95–102`): Logo image `organic-logo.png` has `priority` set (correct) and explicit `width={1000} height={335}` (correct). Not a CLS risk. No LCP issue here.
- **CLS risk** (`src/components/home/campaign-carousel.tsx:50–53`): `<img src={campaign.banner_url}>` has no `width`/`height` attributes and no aspect-ratio CSS. The carousel slot will shift when the image loads. Reserve space with `aspect-ratio: 16/9` on the container or switch to `next/image` with `fill` + a sized container.
- **Bundle / TTI**: Four TanStack Query hooks fire on mount with no SSR data prefetching. The page is `'use client'` but has no skeleton for the stats section during loading, causing a content pop-in that triggers CLS. Add skeleton placeholders for the trust strip section.
- **GovernanceSummaryCard static import** (`src/app/[locale]/page.tsx:26`): Adds AI/governance module to the initial client bundle. Make dynamic (same pattern as dashboard).

### `/[locale]/dashboard`

- **LCP**: `IdentityTile` and `TokenTile` are immediately rendered from `data` which comes from a single `useDashboardData()` fetch. If the API response is slow, the page shows a large skeleton for an extended period. No specific LCP bloat beyond normal fetch latency.
- **Jupiter Terminal script** (`src/components/dashboard/jupiter-swap-embed.tsx`): Injects `https://terminal.jup.ag/main-v2.js` via a `<script>` appended to `document.body` inside `useEffect`. This is a third-party script not loaded async/deferred in the Next.js controlled way — it fires immediately after mount. `JupiterSwapEmbed` should be wrapped in `dynamic(..., { ssr: false })` in `dashboard/page.tsx:12` so the injection is deferred past TTI.
- **No CLS risks** found in dashboard — all tiles use explicit dimensions.

### `/[locale]/members`

- Bundle is only 89.7 kB (good — the page shell is a server component that defers everything to client components via async fetch). No specific CWV risks identified.
- Avatar images in member cards: verify `user_profiles.avatar_url` rendered via `<Image>` with explicit `width`/`height` (search returned no issues from the Radix `Avatar` component which handles this).

### `/[locale]/proposals`

- First load 316 kB. Page is `'use client'` (490 lines) with static imports for all dialogs and modals.
- No image CLS risks found.
- **TBT risk**: 316 kB is parsed synchronously on the client thread. On low-end mobile this can spike TBT above 200 ms. The primary fix is lazy-loading the modal components (new proposal modal, delete dialog).

### `/[locale]/profile/[id]` (profile)

- First load 318 kB. `'use client'` (541 lines).
- `src/app/[locale]/profile/page.tsx:27–28` — `useMyEggs` and `EGG_ELEMENTS` import easter egg data eagerly; if this feature is seasonal/low-use, gate it with a feature flag import.
- `src/components/profile/profile-social-tab.tsx:376` — `<img>` without dimensions for a social preview card. CLS risk if the image appears above the fold on mobile.
- **No font CLS**: All fonts use `font-display: swap` with variable woff2 files — good.

---

## 6. Server-side Waterfalls

| File | Line | Issue | Fix |
|---|---|---|---|
| `src/app/api/dashboard/route.ts` | 249–257 | `loadSprintHero()` is `await`ed sequentially before the outer `Promise.all`. The sprint hero itself contains two inner sequential queries (tasks then assignee profiles). Total estimated blocking: 2–3 Supabase RTTs before `loadStatStrip`, `loadActivityDigest`, `getBranding`, `getTokenTrust` can start. | Restructure: run `loadSprintHero()` inside the outer `Promise.all`. Then run `loadStatStrip(sprintId)` and `loadMyContributions(userId, sprintId)` in a second `Promise.all` using the resolved sprint. This saves ~1 sequential RTT on every dashboard load. |
| `src/app/[locale]/tasks/[id]/page.tsx` | 118–191 | `fetchTaskDetails()` fires three sequential Supabase queries: (1) task + relations, (2) assignees, (3) submissions. Each waits for the previous. | Parallelize with `Promise.all`: fetch the task, assignees, and submissions simultaneously. The task row is needed for display but assignees and submissions can begin concurrently since all three only need `taskId`. |
| `src/app/api/notifications/route.ts` | 37–44 | Cursor resolution queries `notifications` for the cursor row's `created_at` before the main listing query. This is an extra RTT on every cursor-paginated request. | Pass `cursor_timestamp` from the client directly (store it alongside the cursor ID in the client state when the page is loaded), eliminating the lookup. |

---

## 7. Re-render Hotspots

| Component | Reason |
|---|---|
| `AuthProvider` (`src/features/auth/context.tsx:19`) | Context value object `{ user, profile, loading, signOut, refreshProfile }` is reconstructed on every render because it is an object literal passed directly to `<AuthContext.Provider value={...}>` (line 93). Any state update (`setLoading`, `setProfile`, etc.) re-creates the object, triggering re-renders in every consumer. Wrap with `useMemo`: `const value = useMemo(() => ({ user, profile, loading, signOut, refreshProfile }), [user, profile, loading, signOut, refreshProfile])`. |
| `SolanaWalletProvider` (`src/features/auth/wallet-provider.tsx:54`) | `<WalletProvider wallets={wallets} autoConnect>` wraps everything. `wallets` is set once from the `useEffect` import, so this is stable after the first effect run. However the `setWallets` call on effect completion triggers a full tree re-render since `WalletProvider` receives a new array reference. This happens once per session — acceptable but worth noting. |
| Sprints page (`src/app/[locale]/sprints/page.tsx`) | 15+ `useState` declarations — every sprint interaction (`selectedSprintId`, `isMoving`, `submitting`, etc.) triggers full re-renders of the 912-line component. Extract `SprintBoardView`, `SprintListView`, `SprintTimeline` into separate lazy-loaded components so state changes in one view don't re-render the others. |
| Home page (`src/app/[locale]/page.tsx`) | Zero `useMemo`/`useCallback` usage despite four TanStack Query hooks and derived data (sprint countdown, leaderboard slice, proposal filter). Every auth context update (loading → loaded) re-runs all derived computations synchronously. |
| Dashboard components | All 21 files in `src/components/dashboard/` use `'use client'` but none use `React.memo`. `TestimonialsRail` and `ActivityDigestSection` receive stable props from the parent's `data` object; wrapping them in `memo` would prevent re-renders when unrelated state in `DashboardPage` changes. |

---

## Quick Wins (low effort, high impact)

1. **`src/app/[locale]/page.tsx:26`** — Change `GovernanceSummaryCard` from static import to `dynamic(() => import(...))`. Removes AI module from home page initial bundle. ~2 lines of change.
2. **`src/app/[locale]/pulse/page.tsx:12`** — Change `TokenChart` import to `dynamic`. Aligns with every other chart on the same page.
3. **`src/features/auth/context.tsx:92–93`** — Wrap the context value in `useMemo`. Prevents all `useAuth()` consumers from re-rendering on unrelated state changes. ~5 lines of change.
4. **`src/app/api/dashboard/route.ts:249`** — Move `loadSprintHero()` into the outer `Promise.all`. Save 1 sequential RTT on every dashboard API response. ~15 lines of restructuring.
5. **`src/app/[locale]/tasks/[id]/page.tsx:163–190`** — Parallelize `task_assignees` and `task_submissions` fetches with the main task query using `Promise.all`. Client-side, no DB changes needed.
6. **`src/app/api/members/route.ts:59–76`** — Replace the second full `user_profiles` scan for `role_counts` with a parallel aggregate query (`select role, count(*) ... group by role`). Eliminates a full-table scan on every members list load.
7. **`src/app/api/analytics/route.ts:76–79`** — Add `.limit(5000)` to the four unbounded trust-window queries (`votes`, `task_submissions`, `comments`, `activity_log`). One line each, prevents OOM under high traffic.
8. **`src/components/home/campaign-carousel.tsx:50–53`** — Add `width` and `height` attributes (or use `aspect-ratio` on the container) to the banner `<img>`. Eliminates CLS in the hero area.
9. **Add `idx_posts_popular` index** — One migration, one `CREATE INDEX` statement. Covers the `popular` sort path that currently does a full-table scan sorted by `likes_count`.
10. **`src/app/[locale]/dashboard/page.tsx:12`** — Wrap `JupiterSwapEmbed` in `dynamic(..., { ssr: false })`. Defers the third-party Jupiter Terminal script injection past TTI.

---

## Out of Scope / Blockers

- **CDN-layer caching**: Leaderboard already sets `Cache-Control: public, s-maxage=300`. No further CDN changes audited (out of scope per constraints).
- **Database indexes on `golden_eggs`**: Table may be an Easter campaign archive with restricted RLS — verify before adding indexes.
- **Recharts bundle size**: All recharts consumers are already wrapped in `dynamic` on the pulse/analytics pages. The `allocation-chart.tsx` and `treasury` page were not in the top-traffic pages list and were not audited for bundle impact.
- **`admin/settings` at 316 kB**: The 20 kB route chunk is large but the page is admin-only (low traffic). Deferred.
- **`react-hot-toast`**: Present in multiple heavy pages. No alternative audited — replacement would require testing all toast callsites.
- **`@solana/wallet-adapter-wallets`**: Already lazy-loaded via `useEffect` in `SolanaWalletProvider` (line 31–47). No further action needed.
- **Lighthouse / real CWV**: Requires a deployed environment. All findings above are static analysis only. Recommend running Lighthouse against staging post-deploy.
