# QA Plan: 4.18 Twitter/X Linking and Engagement Verification

**Date:** 2026-03-23
**Section:** 4.18 Twitter/X
**Severity:** S1
**Cases:** 12 (9 PASS, 2 PARTIAL, 1 SKIP)

---

## Functional Fixes (qa-fixer)

### Fix 1: TwitterSubmissionForm missing request body (S1)

**Bug:** `handleConnectTwitter` in `src/components/tasks/submission-forms/twitter-submission-form.tsx` sends `POST /api/twitter/link/start` without a body. The `parseJsonBody` helper returns `null` for empty bodies, but the Zod schema `z.object({...}).optional()` rejects `null` (`.optional()` allows `undefined`, not `null`). Result: 400 "Expected object, received null".

**Root cause:** The profile page (`src/app/[locale]/profile/page.tsx`) was fixed previously (commit 5a76747) to include `body: JSON.stringify({})`, but the same fix was never applied to the Twitter submission form.

**File:** `src/components/tasks/submission-forms/twitter-submission-form.tsx`
**Line:** ~112-115
**Change:** Add `body: JSON.stringify({})` to the fetch call in `handleConnectTwitter`.

```diff
 const response = await fetch('/api/twitter/link/start', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
+  body: JSON.stringify({}),
 });
```

**Verification:** Call `POST /api/twitter/link/start` from browser without body → should still work (or fix the API to tolerate null).

**Alternative fix (defense in depth):** Also update `parseJsonBody` to return `undefined` instead of `null` for empty bodies, so Zod's `.optional()` accepts it. This prevents future callers from hitting the same issue.

```diff
// src/lib/parse-json-body.ts line 11
-      return { data: null as T, error: null };
+      return { data: undefined as T, error: null };
```

### Fix 2: task_assignees query 400 error (S1, cross-cutting)

**Bug:** `task_assignees` Supabase query with `user_profiles` join returns 400. Console shows repeated 400s on `GET /rest/v1/task_assignees?select=*,user:user_profiles(...)`. This blocks "Join Task" → "Submit Work" flow for ALL task types, not just Twitter.

**Impact:** No user can join any task or submit work. This is a cross-cutting infrastructure issue.

**Root cause investigation needed:** Check if `task_assignees` table schema matches the query join. Possible causes:
- Missing foreign key from `task_assignees.user_id` to `user_profiles.id`
- RLS policy blocking the query
- Schema change that removed or renamed a column

**Note:** This bug is NOT Twitter-specific. It should be logged as a cross-cutting issue in `docs/qa-dashboard.md` and fixed independently.

---

## Cases Fully Passing (no fixes needed)

| Case | Verdict | Notes |
|------|---------|-------|
| TW-01 | PASS S3 | Profile card renders linked/unlinked correctly on mobile + desktop |
| TW-02 | PASS S3 | OAuth redirect with PKCE S256 works, correct scopes + redirect_uri |
| TW-03 | PASS S3 | Success toast + URL param cleanup |
| TW-04 | PASS S3 | Error toast with reason + URL param cleanup |
| TW-05 | PASS S3 | API returns correct shape, auth enforced |
| TW-06 | PASS S3 | Idempotent unlink, no crash |
| TW-08 | PASS S3 | Missing config shows red error card |
| TW-11 | PASS S3 | admin/council role check on review endpoint |
| TW-12 | PASS S3 | Mobile layout clean, touch targets OK |

## Cases Needing Fixes

| Case | Verdict | Fix |
|------|---------|-----|
| TW-07 | PARTIAL S1 | Fix 1 (submission form body) + Fix 2 (task_assignees) |
| TW-09 | PARTIAL S1 | Fix 1 (submission form connect handler) |
| TW-10 | SKIP | Blocked by Fix 2 (cannot reach submission form) |

---

## Visual/UX Direction (prototype-executor)

### Current State Assessment

**Design system compliance:** 3/5
- Profile Twitter card uses correct amber/emerald semantic colors
- Submission form follows organic-ux spacing
- Missing: organic-terracotta focus rings, skeleton loading states, empty state illustrations

### Benchmark Gaps

1. **Profile Twitter card vs Stripe Connected Accounts:**
   - Stripe shows connected service logo + name + status badge inline
   - Current: plain text with `@` icon, no Twitter/X brand mark
   - Gap: no visual distinction from other social fields, no brand recognition

2. **Submission form connect CTA vs Linear's integration prompts:**
   - Linear shows inline integration setup with icon + description + single CTA
   - Current: amber box with text + button is functional but plain
   - Gap: no illustration or brand presence, feels like a warning rather than an invitation

3. **Task type badge vs GitHub's label system:**
   - GitHub uses colored labels with clear visual weight
   - Current: "Twitter/X Engagement" in plain text badge
   - Gap: no icon differentiation from other task types, no color coding

### Revamp Priorities

1. **Twitter/X brand presence:** Add X logo/icon to the profile card and submission form. Use brand-appropriate styling (not just a generic `@` icon).

2. **Connected account card pattern (Stripe-inspired):**
   - Show profile image, display name, @username, verified badge
   - Inline disconnect button with confirmation
   - Last verified timestamp

3. **Submission form upgrade (Linear-inspired):**
   - Show target tweet preview (embed or card)
   - Engagement type as visual indicator (heart/retweet/comment icons)
   - Progress steps: Connect → Engage → Screenshot → Submit

4. **Empty state for unlinked (Notion-inspired):**
   - Warm illustration with X logo
   - Clear value proposition ("Link your X account to earn points by engaging with community tweets")
   - Single prominent CTA

5. **Task type badge differentiation:**
   - Add Twitter/X icon to task type badge
   - Use sky/blue color for Twitter tasks (vs orange for standard)
   - Show engagement type on task card in list view

---

## Test Data Created

- Task: "QA Twitter Engagement Test Task" (ID: `e6e534cc-526d-4d6f-befd-6d1f5dbc6367`)
  - Type: `twitter` / Like engagement
  - Target tweet: `https://x.com/organic_dao/status/1234567890123456789`
  - 50 points, 500 XP
  - Created by QA Admin

---

## Handoff

1. **Fix bugs first:** `use qa-fixer for docs/plans/2026-03-23-twitter-qa-revamp.md`
2. Then `/clear` and revamp UI: `use prototype-executor for docs/plans/2026-03-23-twitter-qa-revamp.md`
