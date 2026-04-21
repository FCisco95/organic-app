# Translation Admin Toggles

**Created:** 2026-04-21
**Branch:** `fix/app-audit-iter1` (or spin `feat/translation-toggles` off main)
**Status:** Shipped in branch `fix/translation-toggles` (2026-04-21)
**Owner:** TBD

---

## Goal

Give admins a single surface to turn on/off translation per content type, app-wide. Default state:

- `posts` ON
- `proposals` ON
- `ideas` ON
- `tasks` ON (new — not currently translatable)
- `comments` OFF (disabled for launch; may revisit)

Priority language pair: **ZH ↔ EN**. Other DeepL-supported pairs keep working if the flag is on, but ZH↔EN is the acceptance criterion.

## Context

Existing translation infra:

- Hooks: `src/features/translation/hooks.ts` (`useContentTranslation`, `usePostTranslation`, `useProposalTranslation`, `useIdeaTranslation`) and `src/features/translation/comment-hooks.ts`.
- Routes: `/api/posts/[id]/translate`, `/api/proposals/[id]/translate`, `/api/ideas/[id]/translate`, plus comment translate route.
- Provider: `src/lib/translation/deepl-provider.ts`, `src/lib/translation/translate-content.ts`.
- UI mount example: `src/components/posts/PostFeedCard.tsx` lines 114–200 (the Translate button branch).

Settings:
- App is single-tenant today — one `orgs` row. `src/app/api/settings/route.ts` manages org-level config.
- No translation settings column exists yet.

Gap:
- **Tasks** have no translation hook/route today. If we want `tasks` toggleable, we need to add translation for them (mirror the idea/proposal pattern).

## Plan

### Phase A — Data model + settings API

1. Add a new JSON column `translation_settings` to `orgs` table via migration, default:
   ```json
   { "posts": true, "proposals": true, "ideas": true, "tasks": true, "comments": false }
   ```
   - Migration file: `supabase/migrations/<timestamp>_add_translation_settings.sql`.
   - No RLS change.

2. Extend `src/app/api/settings/route.ts` to return and accept `translation_settings`. Add Zod schema in `src/features/settings/schemas.ts`:
   ```ts
   const translationSettingsSchema = z.object({
     posts: z.boolean(),
     proposals: z.boolean(),
     ideas: z.boolean(),
     tasks: z.boolean(),
     comments: z.boolean(),
   });
   ```

3. Expose a lightweight public GET — or piggyback on an already-public settings endpoint — so the client can read flags without admin auth. Prefer a dedicated read-only `/api/settings/public-flags` endpoint returning only the translation flags + any other truly public config, to keep the admin PATCH path gated.

### Phase B — Admin UI

4. Add a **Translation** tab to `src/app/[locale]/admin/settings/` (pattern from existing `src/components/settings/*-tab.tsx`).
   - Five toggle rows, one per content type.
   - Copy labels + descriptions localized in `messages/en.json` / `messages/zh.json` under `Admin.translation.*`.
   - Save → PATCH `/api/settings` with `{ translation_settings: {...} }`.
   - Admin role gate (same as other admin settings).

5. Add an "info" note on the tab: "DeepL Free plan. Limit: 500k chars/month. Monitor usage in ..." (link to DeepL dashboard).

### Phase C — Enforce flags in UI

6. Client-side flag hook: `src/features/translation/use-translation-flags.ts` — React Query against the public flags endpoint, staleTime 5 min.
7. In each translate-button mount site, gate `shouldShowButton` with the flag:
   - `src/components/posts/PostFeedCard.tsx` → `posts` flag
   - Proposal detail translate UI → `proposals` flag
   - Idea detail translate UI → `ideas` flag
   - Task detail (new) → `tasks` flag
   - Comment translate UI → `comments` flag
8. Belt + braces: in each `/api/<type>/[id]/translate` route, also check the flag server-side and return `403 Forbidden` if off. Prevents a client bypass burning DeepL quota.

### Phase D — Add task translation (new)

9. Create `/api/tasks/[id]/translate/route.ts` — mirror the ideas route.
10. Add `useTaskTranslation` in `src/features/translation/hooks.ts`.
11. Mount the translate button on task detail views: `src/components/tasks/**` (wherever title/description are rendered for the reader).
12. Field set to translate: `title`, `description`. Skip submission content for v1.

### Phase E — Remove comment translate UX (but keep infra)

13. Remove / hide the comment translate button in all comment components. Keep the hook and route for when `comments` flag flips on later. A server-side flag check will block translation requests regardless.
14. Grep for comment-hook usage and confirm every call site respects the flag.

## Files to touch

- New: `supabase/migrations/<timestamp>_add_translation_settings.sql`
- New: `src/components/settings/translation-tab.tsx`
- New: `src/features/translation/use-translation-flags.ts`
- New: `src/app/api/tasks/[id]/translate/route.ts`
- New: `src/app/api/settings/public-flags/route.ts`
- Modify: `src/app/api/settings/route.ts`, `src/features/settings/schemas.ts`
- Modify: `src/features/translation/hooks.ts` (add `useTaskTranslation`)
- Modify: `src/components/posts/PostFeedCard.tsx` (gate button by flag)
- Modify: each proposal/idea/task detail mount site (gate by flag)
- Modify: comment components — hide translate UI
- Modify: each `translate/route.ts` — server-side flag check
- Modify: `messages/en.json`, `messages/zh.json` — admin tab copy

## Tests

- `tests/security/translation-flags.test.ts` — PATCHing translation_settings requires admin; non-admin gets 403.
- `tests/features/translation-flag-enforcement.test.ts` — when `posts=false`, POST `/api/posts/[id]/translate` returns 403.
- `tests/features/translation-task.test.ts` — task translate route returns DeepL result when flag on.
- UI snapshot: translate button hidden when flag off on the post card.

## Verification

**Commands:**
```bash
npm run lint
npx vitest run tests/security/ tests/features/translation*
npm run build
# Apply migration
npx supabase db reset   # local only
```

**Manual checks:**
1. Log in as admin, flip `comments=false` (already default). Load a post with comments — no translate button on comments.
2. Load a non-English post — translate button visible and translates to current locale (test EN→ZH and ZH→EN).
3. Flip `posts=false` in admin UI. Reload feed — translate button disappears from all post cards.
4. Call `POST /api/posts/<id>/translate` directly with `posts=false` — expect 403.
5. Navigate to a task detail in non-native language — translate button visible, works.
6. DeepL quota dashboard after 10 translations — counter increments roughly as expected.

## Risks

- **DB migration** touches `orgs`. Backfill default JSON for the existing single row. Reversible.
- **Comment translate hook still referenced** — leave hook intact but hide UI; server-side flag check prevents quota burn.
- **Cache invalidation** — if admin flips a flag, client UI uses 5-min stale window. Acceptable; document it.
- **Not auth/wallet/RLS semantic-change** — schema change is additive only.

---

## Diagnostic findings (2026-04-21, fix/translation-toggles)

Verified plan premises against current tree before implementing. Adjustments:

1. **Tasks table has NO `detected_language` column.** Translation-expansion migration (`20260416000001_translation_expansion.sql`) added it to `proposals`, `ideas`, `comments`, `task_comments` but NOT `tasks`. Phase D needs to either add it (consistent) or skip detection (button always shows). Decision: add `detected_language` column to `tasks` for consistency with the other translatable types. Minimal schema addition, additive only.
2. **`TranslatableContentType` enum must grow**. `src/lib/translation/translate-content.ts:13` currently `'post' | 'comment' | 'task_comment' | 'proposal' | 'idea'`. Must add `'task'` for the new cache rows.
3. **Middleware rate-limit pattern** at `src/middleware.ts:54` must be updated to include `/api/tasks/[^/]+/translate`. Otherwise DeepL quota isn't bucket-capped.
4. **Existing `tests/security/translation-auth.test.ts` enumerates routes** via `TRANSLATE_ROUTES` array. Adding the task route means updating that list, plus updating the middleware regression test (`comments|proposals|ideas` → include `tasks`).
5. **Public flag endpoint**: existing GET `/api/settings/route.ts` has no auth check — `orgs` is public-SELECT via RLS. To keep the admin-only PATCH path distinct and narrow what leaks to unauthenticated clients, use a dedicated `/api/settings/public-flags` returning only the translation flags (no secrets).
6. **Comment translate UI mount sites to hide** (Phase E): `src/components/tasks/task-comments-section.tsx:55`, `src/app/[locale]/proposals/[id]/page.tsx:184`, `src/app/[locale]/posts/[id]/page.tsx`, `src/app/[locale]/ideas/[id]/page.tsx`. Keep `useCommentTranslation` hook intact.
7. **Translate button mount sites to gate** (Phase C): `src/components/posts/PostFeedCard.tsx:186` and `:359` (FeaturedPostCard + standard), `src/app/[locale]/proposals/[id]/page.tsx:658` (`canTranslateProposal`), `src/app/[locale]/ideas/[id]/page.tsx` (analogous to proposals).
8. **Settings admin page** (`src/app/[locale]/admin/settings/page.tsx`) uses an inlined `TAB_GROUPS` const + `renderTabContent()` switch, not the older `SettingsTabs` component in `src/components/settings/settings-tabs.tsx`. That older file is effectively dead — update the live `page.tsx` instead.
9. **Settings GET returns org via `ORG_COLUMNS` allowlist**. Need to add `translation_settings` to that string AND to the `Organization` type in `src/features/settings/types.ts` so the tab can read current values.
10. **i18n locale file is `zh-CN.json`**, not `zh.json` as the plan spelled it. Also need `pt-PT.json` updated (repo ships all three).

Implementation order below follows Phases A→E with these adjustments folded in.

---

## Out of scope

- Per-community translation toggles (deferred until multi-tenant).
- Per-language-pair toggles (deferred).
- LLM-based (non-DeepL) translation.
- Translation memory / glossary.
