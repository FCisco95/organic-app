# Spec A: Translation DRY Refactor + Content Expansion

**Date:** 2026-04-16
**Status:** Approved
**Depends on:** PR #52 (post + comment translation, shipped 2026-04-15)
**Feeds into:** Spec B (Admin Translation Dashboard), Spec C (Language Strategy + Preferences)

---

## Goal

Expand on-demand translation from posts/comments to proposals, ideas, and all comment types. Extract a shared `translateContent()` helper to eliminate the 90% code duplication between existing translate routes. Fix the RLS security bug on `content_translations`. Add `provider_chars_used` and `tenant_id` columns for future SaaS analytics.

## Scope

### In scope
- DRY refactor: extract `translateContent()` from existing post/comment routes
- Proposal translation (title, body, summary — 3 of 7 fields)
- Idea translation (title, body)
- Unified comment translation route (replaces per-parent comment routes)
- Language detection at write time for proposals, ideas, all comment types
- Backfill `detected_language` for existing rows
- RLS hotfix: restrict INSERT/DELETE to service_role
- Add `provider_chars_used` and `tenant_id` columns to `content_translations`
- Tests: unit, security, route-level integration

### Out of scope (deferred)
- Proposal fields: motivation, solution, budget, timeline (expand if users ask)
- Proposal versions translation (archive rows get own UUID, cache stays valid)
- Task/task_submission/dispute translation (Spec A follow-up, low traffic)
- User profile bio translation
- Sprint goal translation
- Auto-translate toggle (Spec C)
- Feed-level "Translate all" control (Spec C)
- Bilingual split view (needs usage data first)
- Admin dashboard (Spec B)
- Multi-tenant provider config (Spec D)
- E2E Playwright tests (manual QA sufficient for v1)

---

## Section 1: DRY Refactor — `translateContent()` Helper

**File:** `src/lib/translation/translate-content.ts`

### Interface

```typescript
interface ContentTranslationConfig {
  contentType: string;           // 'post' | 'comment' | 'proposal' | 'idea'
  contentId: string;
  fields: { name: string; text: string }[];
  sourceLocale: string | null;
  targetLocale: SupportedLocale;
}

interface ContentTranslationResult {
  translations: Record<string, string>;  // {title: '...', body: '...'}
  cached: boolean;
  sourceLocale: string;
  providerCharsUsed: number;             // 0 if full cache hit
}

async function translateContent(config: ContentTranslationConfig): Promise<ContentTranslationResult>
```

### Behavior

1. Query `content_translations` for all requested fields at once
2. Full cache hit → return cached, `providerCharsUsed: 0`
3. Partial cache hit → only translate uncached fields (saves DeepL chars)
4. Call provider for uncached fields
5. Write cache rows with `provider_chars_used` per row
6. Return merged result (cached + fresh)

### Responsibilities NOT in this helper

- Authentication (route handler)
- Rate limiting (route handler)
- Content fetching (route handler — each content type has different access rules)
- Cache invalidation (edit handlers on each content type)

### Refactoring impact

- Post translate route: ~181 lines → ~50 lines (fetch post + thread parts, call helper, return)
- Comment translate route: ~100 lines → ~30 lines (fetch comment, call helper, return)

---

## Section 2: Database Changes

**Migration:** `supabase/migrations/20260416000000_translation_expansion.sql`

### 2a. Extend `content_translations` table

```sql
ALTER TABLE content_translations
  ADD COLUMN provider_chars_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN tenant_id UUID;

CREATE INDEX idx_translations_tenant ON content_translations (tenant_id)
  WHERE tenant_id IS NOT NULL;
```

### 2b. Fix RLS policies (security hotfix)

```sql
DROP POLICY "Service role can insert translations" ON content_translations;
DROP POLICY "Service role can delete translations" ON content_translations;

CREATE POLICY "Service role can insert translations"
  ON content_translations FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete translations"
  ON content_translations FOR DELETE
  USING (auth.role() = 'service_role');
```

SELECT policy stays as-is (public read — translations are derived from public content).

### 2c. Add `detected_language` to content tables

```sql
ALTER TABLE proposals ADD COLUMN detected_language TEXT;
ALTER TABLE ideas ADD COLUMN detected_language TEXT;
ALTER TABLE comments ADD COLUMN detected_language TEXT;
ALTER TABLE task_comments ADD COLUMN detected_language TEXT;

CREATE INDEX idx_proposals_lang ON proposals (detected_language) WHERE detected_language IS NOT NULL;
CREATE INDEX idx_ideas_lang ON ideas (detected_language) WHERE detected_language IS NOT NULL;
CREATE INDEX idx_comments_lang ON comments (detected_language) WHERE detected_language IS NOT NULL;
```

No `detected_language` on tasks, disputes, task_submissions — out of scope for v1.

---

## Section 3: API Routes

### 3a. Proposal translation

**Route:** `src/app/api/proposals/[id]/translate/route.ts`

- Auth: require authenticated user (proposals are public read)
- Fetch proposal by ID
- Pass 3 fields to `translateContent()`: title, body, summary
- Cache invalidation: proposal PATCH handler deletes cached translations
- Version behavior: proposals archived to `proposal_versions` get new UUIDs, so old cache stays valid and new version gets fresh translation on first request

### 3b. Idea translation

**Route:** `src/app/api/ideas/[id]/translate/route.ts`

- Auth: require authenticated user
- Fetch idea by ID
- Pass 2 fields to `translateContent()`: title, body
- Cache invalidation: idea PATCH handler deletes cached translations

### 3c. Unified comment translation

**Route:** `src/app/api/translate/comment/[commentId]/route.ts`

Replaces the existing `/api/posts/[id]/comments/[commentId]/translate` route.

- Fetch comment by ID from `comments` table
- Read `subject_type` to determine parent content type
- Auth check by parent type:
  - `subject_type = 'post'` → public, allow any authenticated user
  - `subject_type = 'proposal'` → public, allow any authenticated user
  - `subject_type = 'task'` → verify user is org member
- Pass 1 field to `translateContent()`: body
- Old post comment translate route: delete and update client hook to use new path

### 3d. Middleware update

Expand `TRANSLATE_RATE_LIMIT_PATH_PATTERN` to match:
```
/api/proposals/[id]/translate
/api/ideas/[id]/translate
/api/translate/comment/[commentId]
```

All routes share the single `translate` rate limit bucket: 20/hr per user across all content types combined.

### 3e. Cache invalidation additions

| Edit handler | Invalidation |
|---|---|
| Proposal PATCH | Delete `content_type = 'proposal'` rows for that ID |
| Idea PATCH | Delete `content_type = 'idea'` rows for that ID |
| Comment edit (if exists) | Delete `content_type = 'comment'` rows for that ID |
| Post PATCH (existing) | Already implemented |

---

## Section 4: Client-Side Hooks + UI

### 4a. Generalized hook

**File:** `src/features/translation/hooks.ts`

```typescript
function useContentTranslation(
  contentType: 'post' | 'proposal' | 'idea',
  contentId: string,
  detectedLanguage: string | null,
  fields: string[]
): {
  translations: Record<string, string> | null;
  isTranslated: boolean;
  isLoading: boolean;
  error: string | null;
  translate: () => Promise<void>;
  showOriginal: () => void;
  shouldShowButton: boolean;
}
```

Route mapping inside the hook:
- `'post'` → `/api/posts/${id}/translate`
- `'proposal'` → `/api/proposals/${id}/translate`
- `'idea'` → `/api/ideas/${id}/translate`

Comment wrapper:
```typescript
function useCommentTranslation(commentId: string, detectedLanguage: string | null)
// Hits /api/translate/comment/${commentId}
```

`usePostTranslation` becomes a thin wrapper calling `useContentTranslation('post', ...)` — no breaking change.

### 4b. Proposal detail UI

Segmented toggle bar below the proposal header:

```
┌─────────────────────────────────────┐
│  Reading in:  [English] | Original  │
└─────────────────────────────────────┘
```

- Translates title + body + summary in one call
- Toggle persists for page session only
- Loading state: skeleton shimmer over text fields (not a spinner)
- Proposal list/feed: no translation (save chars, users click through to detail)

### 4c. Idea detail UI

Same X-style inline "Translate idea" button as posts — ideas are short-form.

### 4d. Comment translate buttons

All comment types (post, proposal, idea, task) use the same small "Translate" link. Unified hook + route means identical UI component everywhere.

### 4e. i18n keys

Add to all 3 locale files (en, pt-PT, zh-CN):

| Key | en | pt-PT | zh-CN |
|---|---|---|---|
| `translateProposal` | Translate proposal | Traduzir proposta | 翻译提案 |
| `translateIdea` | Translate idea | Traduzir ideia | 翻译想法 |
| `readingIn` | Reading in | A ler em | 阅读语言 |
| `readingOriginal` | Original | Original | 原文 |

---

## Section 5: Language Detection + Testing

### 5a. Wire `detectLanguage()` into creation routes

Add `detected_language: detectLanguage(body)` to INSERT payloads in:

| Route | Table | Detection field |
|---|---|---|
| `POST /api/proposals` | proposals | body |
| `POST /api/ideas` | ideas | body |
| `POST /api/posts/[id]/comments` | comments | body |
| `POST /api/proposals/[id]/comments` | comments | body |
| `POST /api/tasks/[id]/comments` | task_comments | content |

### 5b. Backfill script

Rename `scripts/backfill-post-language.ts` → `scripts/backfill-detected-language.ts`

Handles all tables sequentially:
1. Posts (existing, detect on `title + body`)
2. Proposals (detect on `body`)
3. Ideas (detect on `body`)
4. Comments (detect on `body`)
5. Task comments (detect on `content`)

Log progress per table. Safe to re-run (only updates rows where `detected_language IS NULL`).

### 5c. Test matrix

| Test file | Coverage |
|---|---|
| `src/lib/translation/__tests__/translate-content.test.ts` | Helper: full cache hit, cache miss, partial cache, char counting, error handling |
| `src/features/translation/__tests__/schemas.test.ts` | Extend: proposal/idea content types in validation |
| `tests/security/translation-rls.test.ts` | Anon users can't insert/delete translations; service role can |
| `tests/security/translation-auth.test.ts` | All translate routes reject unauthenticated requests |
| Route integration tests (per route) | 401 without auth, 404 missing content, 400 bad locale, 200 valid request, cache hit on second call |

### 5d. Type updates

Add `detected_language: string | null` to:
- `Proposal` type in `src/features/proposals/types.ts`
- `Idea` type in `src/features/ideas/types.ts`
- `Comment` type (wherever defined)
- `TaskComment` type (wherever defined)

---

## DeepL Budget Impact

Current (posts + post comments only): ~low usage, well within 500K chars/mo.

After expansion (rough estimates):
- Proposals: 7 active proposals/month × 3 fields × ~500 chars avg × 2 locale targets = ~21,000 chars
- Ideas: ~10 ideas/month × 2 fields × ~300 chars × 2 targets = ~12,000 chars
- Comments: ~50 comments/month × 1 field × ~150 chars × 2 targets = ~15,000 chars
- Posts (existing): ~100 posts/month × 2 fields × ~300 chars × 2 targets = ~120,000 chars

**Estimated total: ~168,000 chars/month** — comfortably within 500K free tier. The `provider_chars_used` column will give us real numbers for Spec B's admin dashboard.

---

## Implementation Order (for writing-plans)

1. RLS hotfix migration (blocking, ship first)
2. `translateContent()` helper extraction
3. Refactor existing post + comment routes to use helper
4. Database migration (new columns, indexes)
5. Proposal translate route + cache invalidation
6. Idea translate route + cache invalidation
7. Unified comment translate route + retire old route
8. Client hooks refactor (generalized hook)
9. Proposal detail toggle UI + i18n
10. Idea detail translate button + i18n
11. Language detection wiring in creation routes
12. Backfill script expansion
13. Type updates
14. Tests (unit, security, integration)
15. Middleware update

---

## Future specs (documented, not planned)

- **Spec B:** Admin translation dashboard (DeepL usage, cache hit rate, per-type breakdown, purge, feature toggle)
- **Spec C:** Language strategy (expand target locales, per-user preferred target, auto-translate toggle, fallback chain)
- **Spec D:** Multi-tenant scoping (tenant_id activation, per-tenant provider config, glossary, rate limits)
