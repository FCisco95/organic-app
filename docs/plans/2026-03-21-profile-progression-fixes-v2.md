# Profile & Progression Fixes v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 bugs (3 S1, 1 S2) found in the 2026-03-20 re-test of section 4.5 — quest i18n prefix mismatch, Twitter connect empty body, Community profile missing i18n keys, and achievement peacemaker name.

**Architecture:** Four independent fixes targeting different subsystems. Quest fix patches a prefix check in progression-shell.tsx. Twitter connect fix adds a JSON body to the fetch call. Community and achievement fixes add missing i18n keys to all 3 locale files. No new files created, no schema changes.

**Tech Stack:** Next.js App Router, next-intl, Supabase, Zod

**QA Reference:** `docs/qa-runbook.md` section 4.5 (PROF-05, PROF-08, COMM-PROF)

---

## Branch Strategy

```bash
git switch main
git pull --ff-only
git switch -c fix/4.5-profile-fixes-v2
```

---

### Task 1: Fix quest i18n prefix mismatch — titles show raw UUID keys

**Problem:** `resolveQuestTitle` at `progression-shell.tsx:184` checks `result.startsWith('questCopy.')` to detect a missed i18n key. But `t()` from `useTranslations('Gamification')` returns the **full namespace path** on miss: `Gamification.questCopy.<uuid>.title`. The prefix check never matches because the string starts with `Gamification.`, not `questCopy.`. The fallback to `quest.title` (which has the correct DB value) never fires.

**Root cause:** Prefix check doesn't account for the namespace prefix added by `next-intl`.

**Files:**
- Modify: `src/components/gamification/progression-shell.tsx:180-191`

**Step 1: Fix the prefix check in both resolve functions**

Replace lines 180-191:

```typescript
// BEFORE (broken — misses the namespace prefix)
const resolveQuestTitle = (quest: QuestProgressItem): string => {
  const key = `questCopy.${quest.id}.title` as any;
  const result = t(key);
  // t() returns the key path on miss — detect and fall back to DB title
  return result.startsWith('questCopy.') ? quest.title : result;
};

const resolveQuestDescription = (quest: QuestProgressItem): string => {
  const key = `questCopy.${quest.id}.description` as any;
  const result = t(key);
  return result.startsWith('questCopy.') ? (quest.description || '') : result;
};
```

With:

```typescript
// AFTER — check for UUID in the returned string (indicates a miss)
const resolveQuestTitle = (quest: QuestProgressItem): string => {
  const key = `questCopy.${quest.id}.title` as any;
  const result = t(key);
  // t() returns full namespace path on miss (e.g. "Gamification.questCopy.<uuid>.title")
  // Detect miss by checking if the result contains the quest UUID
  return result.includes(quest.id) ? quest.title : result;
};

const resolveQuestDescription = (quest: QuestProgressItem): string => {
  const key = `questCopy.${quest.id}.description` as any;
  const result = t(key);
  return result.includes(quest.id) ? (quest.description || '') : result;
};
```

**Step 2: Verify**

Run: `npm run lint`
Expected: No errors

Run: `npm run build`
Expected: Build succeeds

Manual: Navigate to `http://localhost:3099/en/profile/progression`
Expected: Quest titles show "Daily Builder", "Daily Signal", etc. instead of `Gamification.questCopy.<uuid>.title`. Console errors should drop from 38 to near 0 (the `IntlError: MISSING_MESSAGE` errors will still log but won't affect rendering).

**Step 3: Commit**

```bash
git add src/components/gamification/progression-shell.tsx
git commit -m "fix(progression): quest i18n fallback — detect full namespace path on miss"
```

---

### Task 2: Fix Twitter/X connect 400 error — empty POST body

**Problem:** `handleStartTwitterLink` in profile page sends `fetch('/api/twitter/link/start', { method: 'POST', headers: { 'Content-Type': 'application/json' } })` with **no body**. The `parseJsonBody` helper correctly returns `{ data: null, error: null }` for empty bodies. But the API route then runs `startTwitterLinkSchema.safeParse(null)` where the schema is `z.object({...}).optional()`. Zod's `.optional()` accepts `undefined` but rejects `null`, causing a validation failure → 400 "Invalid request payload".

**Root cause:** Missing `body` in fetch call. Sending `JSON.stringify({})` makes the request valid.

**Files:**
- Modify: `src/app/[locale]/profile/page.tsx` (~line 518)

**Step 1: Add body to the fetch call**

Find the `handleStartTwitterLink` function (around line 514-533). Locate the fetch call:

```typescript
// BEFORE
const response = await fetch('/api/twitter/link/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
```

Replace with:

```typescript
// AFTER
const response = await fetch('/api/twitter/link/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
```

**Step 2: Verify**

Run: `npm run lint`
Expected: No errors

Manual: Navigate to `http://localhost:3099/en/profile`. Click "Connect Twitter/X account".
Expected: No "Invalid request payload" toast. Instead either:
- Redirects to Twitter OAuth page (if Twitter API credentials configured), or
- Shows a different error about Twitter config (expected in dev without credentials)

**Step 3: Commit**

```bash
git add src/app/[locale]/profile/page.tsx
git commit -m "fix(profile): send JSON body in Twitter link start request"
```

---

### Task 3: Add missing Community profile i18n keys

**Problem:** `/community/[id]` page and `profile-tabs.tsx` component reference 8 `Community.*` i18n keys that don't exist in any locale file. This causes 58 console errors per page load and raw key text in the UI.

**Root cause:** Keys were never added when the community profile page was built.

**Files:**
- Modify: `messages/en.json` — `Community` namespace
- Modify: `messages/pt-PT.json` — `Community` namespace
- Modify: `messages/zh-CN.json` — `Community` namespace

**Missing keys (from code analysis):**

| Key | Source File | Line | Context |
|-----|-----------|------|---------|
| `profileTabOverview` | `src/components/community/profile-tabs.tsx` | 17 | Tab label |
| `profileTabReputation` | `src/components/community/profile-tabs.tsx` | 18 | Tab label |
| `profileTabAchievements` | `src/components/community/profile-tabs.tsx` | 19 | Tab label |
| `profileTabActivity` | `src/components/community/profile-tabs.tsx` | 20 | Tab label |
| `quickGlance` | `src/app/[locale]/community/[id]/page.tsx` | 233 | Section heading (interpolated: `{rank, level, tasks}`) |
| `xpBreakdownComingSoon` | `src/app/[locale]/community/[id]/page.tsx` | 279 | Placeholder text |
| `achievementsEarned` | `src/app/[locale]/community/[id]/page.tsx` | 299 | Section heading (interpolated: `{earned, total}`) |
| `activityComingSoon` | `src/app/[locale]/community/[id]/page.tsx` | 321 | Placeholder text |

**Step 1: Add keys to `messages/en.json`**

Find the `"Community"` namespace (around line 2787). Add these keys after the existing `"totalMembers"` key:

```json
"profileTabOverview": "Overview",
"profileTabReputation": "Reputation",
"profileTabAchievements": "Achievements",
"profileTabActivity": "Activity",
"quickGlance": "Rank #{rank} · Level {level} · {tasks} tasks completed",
"xpBreakdownComingSoon": "XP breakdown coming soon.",
"achievementsEarned": "{earned} of {total} achievements earned",
"activityComingSoon": "Activity timeline coming soon."
```

**Step 2: Add keys to `messages/pt-PT.json`**

Find the `"Community"` namespace. Add:

```json
"profileTabOverview": "Visao Geral",
"profileTabReputation": "Reputacao",
"profileTabAchievements": "Conquistas",
"profileTabActivity": "Atividade",
"quickGlance": "Rank #{rank} · Nivel {level} · {tasks} tarefas concluidas",
"xpBreakdownComingSoon": "Detalhamento de XP em breve.",
"achievementsEarned": "{earned} de {total} conquistas obtidas",
"activityComingSoon": "Linha do tempo de atividade em breve."
```

**Step 3: Add keys to `messages/zh-CN.json`**

Find the `"Community"` namespace. Add:

```json
"profileTabOverview": "概览",
"profileTabReputation": "声誉",
"profileTabAchievements": "成就",
"profileTabActivity": "活动",
"quickGlance": "排名 #{rank} · 等级 {level} · {tasks} 个任务已完成",
"xpBreakdownComingSoon": "XP 详情即将推出。",
"achievementsEarned": "已获得 {earned}/{total} 个成就",
"activityComingSoon": "活动时间线即将推出。"
```

**Step 4: Verify**

Run: `npm run lint`
Expected: No errors

Run: `npm run build`
Expected: Build succeeds

Manual: Navigate to `http://localhost:3099/en/community/<any-user-id>`
Expected: Tab labels show "Overview", "Reputation", "Achievements", "Activity". No raw keys visible. Console errors should drop from 58 to 0 (i18n-related).

**Step 5: Commit**

```bash
git add messages/en.json messages/pt-PT.json messages/zh-CN.json
git commit -m "fix(community): add missing i18n keys for profile page tabs and sections"
```

---

### Task 4: Add missing achievement name — peacemaker

**Problem:** `Reputation.achievementNames.peacemaker` is missing from `achievementNames` in all locale files. The description exists (`achievementDescriptions.peacemaker`) but the display name was never added.

**Files:**
- Modify: `messages/en.json` — `Reputation.achievementNames`
- Modify: `messages/pt-PT.json` — `Reputation.achievementNames`
- Modify: `messages/zh-CN.json` — `Reputation.achievementNames`

**Step 1: Add `peacemaker` to `achievementNames` in all 3 locales**

In `messages/en.json`, find `Reputation.achievementNames` (line ~2109). After `"vindicated": "Vindicated"` (line 2127), add:

```json
"peacemaker": "Peacemaker"
```

In `messages/pt-PT.json`, same location:

```json
"peacemaker": "Pacificador"
```

In `messages/zh-CN.json`, same location:

```json
"peacemaker": "和平使者"
```

**Step 2: Verify**

Run: `npm run lint`
Expected: No errors

Manual: Navigate to `http://localhost:3099/en/profile/progression`, scroll to achievements
Expected: "Peacemaker" shows as display name instead of `Reputation.achievementNames.peacemaker`

**Step 3: Commit**

```bash
git add messages/en.json messages/pt-PT.json messages/zh-CN.json
git commit -m "fix(i18n): add missing peacemaker achievement name to all locales"
```

---

## Post-Fix: Update QA Artifacts

### Task 5: Update runbook and dashboard

**Files:**
- Modify: `docs/qa-runbook.md` — section 4.5 status marker
- Modify: `docs/qa-dashboard.md` — pipeline status table + cross-cutting issues

**Step 1: Update runbook status**

Change the status marker at line 188 from:
```
<!-- qa-status: TESTED | severity: S1 | plan: docs/plans/2026-03-19-profile-progression-fixes.md -->
```
To:
```
<!-- qa-status: FIXED | severity: S3 | plan: docs/plans/2026-03-21-profile-progression-fixes-v2.md -->
```

**Step 2: Update dashboard**

In `docs/qa-dashboard.md`, update section 4.5 row:
- Status: `TESTED` → `FIXED`
- Severity: `S1` → `S3`
- Plan: link to `plans/2026-03-21-profile-progression-fixes-v2.md`
- Fix Branch: `fix/4.5-profile-fixes-v2`

Update cross-cutting issues:
- Quest i18n: mark as FIXED
- Twitter connect: mark as FIXED
- Community profile i18n: mark as FIXED

**Step 3: Commit**

```bash
git add docs/qa-runbook.md docs/qa-dashboard.md
git commit -m "docs: update qa-dashboard and runbook — 4.5 fixes applied"
```

---

## Final Validation Checklist

After all tasks:

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `/en/profile/progression` — quest titles show "Daily Builder", "Daily Signal", etc.
- [ ] `/en/profile/progression` — console i18n errors near 0
- [ ] `/en/profile` — "Connect Twitter/X" button no longer shows 400 error
- [ ] `/en/community/<id>` — tabs show "Overview", "Reputation", "Achievements", "Activity"
- [ ] `/en/community/<id>` — console i18n errors near 0
- [ ] `/en/profile/progression` — "Peacemaker" achievement shows display name
- [ ] pt-PT and zh-CN locales render all new keys correctly

## Execution Sequence

```
Task 1 (quest i18n) → Task 2 (Twitter connect) → Task 3 (Community i18n) → Task 4 (peacemaker) → Task 5 (docs)
```

All tasks are independent — can be parallelized if using subagent-driven execution.

**Total files touched:** 5 source/locale files + 2 doc files
**Estimated scope:** Small — all changes are 1-5 lines each
