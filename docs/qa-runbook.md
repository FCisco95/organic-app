# QA Runbook — Organic App

Manual fallback checklist for smoke-testing core user flows before a production release.
Run this when automated E2E tests cannot be executed (e.g. no Supabase credentials in CI).

---

## Setup

| Item | Value |
|------|-------|
| Desktop browser | Chrome or Firefox, latest stable |
| Mobile | Chrome on Android 12+ or Safari on iOS 16+ |
| Accounts needed | 1 admin, 1 council, 1 member, 1 guest (no organic_id) |
| Locale coverage | English + at least one of pt-PT or zh-CN |

---

## Auth and Onboarding

- [ ] Guest can view `/` (home/analytics), `/treasury`, and `/proposals` without signing in.
- [ ] Guest is redirected away from `/tasks`, `/profile`, `/notifications` with a sign-in prompt (no 500 error).
- [ ] Member can sign in with email/password and land on the dashboard.
- [ ] New user sees their Organic ID assigned in the top-bar badge after admin grants it.
- [ ] Wallet connect modal opens and wallet address is saved after signing the nonce message.
- [ ] Wallet can be changed; old address is replaced.
- [ ] Sign-out clears the session; subsequent navigations return to the sign-in state.

---

## Navigation and Layout

- [ ] Sidebar shows the correct items for each role (admin/council see Submissions + Manage Rewards + Settings; member does not).
- [ ] Mobile hamburger opens the mobile sidebar; all nav items are reachable.
- [ ] Locale switcher (top-bar) changes UI language without a full page reload.
- [ ] No hardcoded English strings visible when running in pt-PT or zh-CN locale.
- [ ] `/tasks/templates` shows "Sign in required" gate for unauthenticated users (translated).
- [ ] `/disputes/{id}` with an invalid ID shows "Dispute not found" (translated).

---

## Tasks

- [ ] Admin creates a task (type: development, priority: high, 100 base points).
- [ ] Task appears in the `/tasks` list for a logged-in member.
- [ ] Member can view the task detail page.
- [ ] Member submits work (fill all required fields for the task type).
- [ ] Task status changes to "Review" after submission.
- [ ] Admin/council reviews and approves with quality score 4 → member earns 80 points.
- [ ] Admin/council rejects with a rejection reason → member sees the rejection reason on the submission.
- [ ] Rejected submission shows "Dispute" button on the task detail page.
- [ ] Task templates page (admin only): create, edit, delete a template.

---

## Sprints

- [ ] Admin creates a sprint with name, dates, goal.
- [ ] Sprint appears in `/sprints` list.
- [ ] Admin starts the sprint → status changes to Active.
- [ ] Attempting to start a second sprint shows a conflict error.
- [ ] Admin completes the sprint → snapshot is created; tasks with incomplete status are moved to backlog.
- [ ] Sprint detail page shows task list and completion stats after completion.

---

## Proposals

- [ ] Member creates a proposal (all required fields: title, category, summary ≥50 chars, motivation ≥100 chars, solution ≥100 chars).
- [ ] Proposal appears in `/proposals` as "Draft".
- [ ] Member submits the proposal → status changes to "Submitted".
- [ ] Public can read the proposal without signing in.
- [ ] Admin/council moves the proposal to "Voting" status.
- [ ] Member with a wallet and token balance can vote yes/no/abstain.
- [ ] Member without token balance sees "cannot vote" message.
- [ ] Voting deadline enforced: vote button disabled after deadline.

---

## Disputes

- [ ] Member files a dispute on a rejected submission (evidence text ≥20 chars).
- [ ] Dispute appears in `/disputes` for admin/council.
- [ ] Disputant and reviewer can add comments.
- [ ] Unrelated member cannot view dispute comments (403).
- [ ] Disputant can withdraw an open dispute.
- [ ] Admin/council can resolve a dispute (overturn/uphold/compromise/dismiss).
- [ ] XP stake is returned to the member if the dispute is overturned.

---

## Rewards

- [ ] Member with claimable points sees correct balance on `/rewards`.
- [ ] Member can submit a claim if balance meets the minimum threshold.
- [ ] Claim requires wallet address if `claim_requires_wallet` config is enabled.
- [ ] Admin sees all pending claims on `/admin/rewards`.
- [ ] Admin can approve a claim → status changes to Approved.

---

## Error States

- [ ] Trigger a 404 by visiting a non-existent task URL → app shows 404, not a blank screen.
- [ ] Kill connectivity mid-page → app shows a toast/error, not a crash.
- [ ] `/api/health` returns `{"status":"ok"}` when Supabase is reachable.

---

## Accessibility Quick Checks (keyboard + screen reader)

- [ ] Tab key navigates through all interactive elements in the sidebar and top-bar.
- [ ] Dialogs (wallet connect, dispute form, reward claim) trap focus inside when open.
- [ ] Focus returns to the trigger element after closing a dialog.
- [ ] All icon-only buttons have `aria-label` or `sr-only` text (check sidebar collapse button, notification bell).
- [ ] Avatar fallback initials are visible and high-contrast.

---

## Mobile (375 px viewport)

- [ ] All content is readable without horizontal scroll on the main pages (home, tasks, proposals).
- [ ] Task submission form fields are accessible (not obscured by mobile keyboard).
- [ ] Wallet connect button is reachable in the mobile sidebar.
- [ ] Long proposal titles wrap gracefully, no overflow.

---

## Post-Deploy Smoke (first 24 h)

- [ ] Sentry receives a test error (manually trigger via the global error boundary) — confirm it appears in the Sentry dashboard.
- [ ] `/api/health` returns 200 from production URL.
- [ ] Market cache cron job ran and `/api/treasury` returns live token data.
- [ ] At least one real user action (task submit or proposal create) succeeds end-to-end.
- [ ] No spike in 5xx errors in Vercel analytics in the first hour.
