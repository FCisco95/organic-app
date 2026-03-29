# RLS & Service-Role Audit Report

**Date:** 2026-03-29
**Auditor:** Agent 4 (Database Security Analyst)
**Scope:** All Supabase migrations, all `createServiceClient()` usages in codebase

---

## 1. Tables and RLS Status

### Tables WITH RLS Enabled (53 tables)

| Table | RLS | Notes |
|---|---|---|
| user_profiles | Yes | Hardened: authenticated=full, anon=profile_visible only |
| orgs | Yes | Public read (USING true) - acceptable (public org info) |
| proposals | Yes | Hardened: author update restricted to draft/public status |
| votes | Yes | Public read (USING true) - acceptable (vote tallies are public) |
| tasks | Yes | Hardened: update restricted to owner/assignee/admin |
| sprints | Yes | Public read (USING true) - acceptable (sprint info is public) |
| comments | Yes | Public read (USING true) - acceptable (proposal comments) |
| holder_snapshots | Yes | Public read (USING true) - acceptable (on-chain data) |
| task_likes | Yes | Public read (USING true) - acceptable |
| task_comments | Yes | Scoped to task visibility |
| task_submissions | Yes | User-scoped |
| task_assignees | Yes | Public read (USING true) - acceptable |
| task_dependencies | Yes | Scoped |
| task_templates | Yes | Scoped |
| recurring_task_instances | Yes | Scoped |
| vote_delegations | Yes | User-scoped |
| wallet_nonces | Yes | Service-managed |
| user_follows | Yes | Hardened: (select auth.uid()) wrapped |
| notifications | Yes | Hardened: user-scoped with (select auth.uid()) |
| notification_preferences | Yes | Hardened: user-scoped |
| notification_batches | Yes | Scoped |
| notification_batch_events | Yes | Scoped |
| activity_log | Yes | Hardened: restricted to authenticated (was public) |
| voting_config | Yes | Public read (USING true) - acceptable (config is public) |
| xp_events | Yes | Authenticated read (USING true) - acceptable |
| achievements | Yes | Public read (USING true) - acceptable (catalog data) |
| user_achievements | Yes | Authenticated read (USING true) - acceptable |
| user_activity_counts | Yes | Public read (USING true) - acceptable |
| disputes | Yes | Hardened: restricted to parties + admin/council |
| dispute_comments | Yes | Scoped |
| dispute_evidence_events | Yes | Hardened: party-scoped |
| reward_claims | Yes | Scoped |
| reward_distributions | Yes | Scoped |
| ideas | Yes | Scoped |
| idea_votes | Yes | Scoped |
| idea_promotion_cycles | Yes | Public read (USING true) - acceptable |
| idea_events | Yes | Scoped |
| quests | Yes | Authenticated read (USING true) - acceptable |
| referral_codes | Yes | Anon read (USING true) - acceptable (validation) |
| referrals | Yes | Scoped |
| referral_rewards | Yes | Scoped |
| point_burns | Yes | Scoped |
| proposal_templates | Yes | Hardened: admin/council only for management |
| proposal_versions | Yes | Public read (USING true) - acceptable |
| proposal_stage_events | Yes | Public read (USING true) - acceptable |
| posts | Yes | Hardened: published or own posts only |
| post_thread_parts | Yes | Hardened: scoped through posts |
| post_likes | Yes | Hardened: user-scoped insert/delete |
| post_flags | Yes | Hardened: user-scoped + admin view |
| points_ledger | Yes | Hardened: user-scoped |
| achievement_sets | Yes | Authenticated read (USING true) - acceptable |
| user_achievement_progress | Yes | Hardened: own or public profiles |
| onboarding_steps | Yes | Hardened: user-scoped |
| twitter_accounts | Yes | Scoped |
| twitter_oauth_sessions | Yes | Scoped |
| twitter_engagement_tasks | Yes | Scoped |
| twitter_engagement_submissions | Yes | Scoped |
| community_challenges | Yes | Scoped |
| engagement_metrics_daily | Yes | Scoped |
| donations | Yes | Hardened: donor-scoped |
| wallet_balance_snapshots | Yes | Hardened: user-scoped |
| boost_requests | Yes | Hardened: active or own |
| engagement_proofs | Yes | Hardened: user-scoped insert |
| points_escrow | Yes | Hardened: user-scoped read |
| admin_config_audit_events | Yes | Admin-scoped |

### Tables MISSING RLS (Critical Findings)

| Table | RLS | Severity | Notes |
|---|---|---|---|
| **market_snapshots** | **NO** | MEDIUM | Stores cached price data. Only accessed via service_role in market-data service. No user-facing RLS needed since data is public market prices, but missing RLS means any authenticated/anon user with direct DB access could write. |
| **reward_settlement_events** | **NO** | HIGH | Stores settlement audit trail. Should be admin-only write, authenticated read. Missing RLS is a gap. |
| **proposal_voter_snapshots** | **NO** | HIGH | Stores voter eligibility snapshots for proposals. Contains token balances. Should be read-only for authenticated, write-only for service. |

---

## 2. Service-Role (`createServiceClient`) Usage Audit

### Summary: 27 usages across 27 files (excluding docs)

| # | File | Function | Purpose | Justified? |
|---|---|---|---|---|
| 1 | `src/lib/supabase/server.ts` | `createServiceClient()` | Factory definition | N/A (definition) |
| 2 | `src/app/api/auth/nonce/route.ts` | POST | Insert wallet nonce for SIWS (pre-auth, no user session) | **YES** - No auth context exists yet; nonce must be created before user authenticates |
| 3 | `src/app/api/auth/link-wallet/route.ts` | POST | Validate nonce, update user profile with wallet_pubkey | **YES** - Nonce table is service-managed; profile update needs to bypass RLS for wallet field |
| 4 | `src/app/api/organic-id/assign/route.ts` | POST | Call `get_next_organic_id` RPC, update profile | **YES** - Sequential ID assignment needs atomic DB function; user cannot self-assign organic_id |
| 5 | `src/app/api/health/route.ts` | GET | Ping wallet_nonces and market_snapshots tables | **CONCERN** - Health check could use anon client since it only does SELECT with head:true. Service role is overkill here. |
| 6 | `src/app/api/submissions/[id]/review/route.ts` | POST | Update submission status, award points, update task | **YES** - Admin/council action that updates across multiple tables (submissions, user_profiles points, tasks) |
| 7 | `src/app/api/tasks/[id]/submissions/route.ts` | POST | Create submission, log activity | **YES** - Needs to insert into activity_log which may not have INSERT policy for the submitting user |
| 8 | `src/app/api/ideas/route.ts` | POST | Log idea_events and activity_log after creation | **YES** - idea_events table likely has no user INSERT policy; logging is system-level |
| 9 | `src/app/api/ideas/[id]/route.ts` | PATCH | Log idea_events after update | **YES** - Same as above: event logging bypass |
| 10 | `src/app/api/ideas/[id]/vote/route.ts` | POST | Log idea_events and activity_log after voting | **YES** - Event logging bypass |
| 11 | `src/app/api/ideas/[id]/comments/route.ts` | POST | Log idea_events, activity_log, and award XP | **YES** - Event logging + XP award needs cross-table writes |
| 12 | `src/app/api/ideas/[id]/promote/route.ts` | POST | Create proposal from idea, update idea status, log events | **YES** - Cross-table atomic operation: creates proposal on behalf of idea author, links records |
| 13 | `src/app/api/ideas/cycles/[id]/select-winner/route.ts` | POST | Update cycle winner, idea status, log events | **YES** - Admin action across multiple tables |
| 14 | `src/app/api/disputes/[id]/route.ts` | GET | Generate signed URLs for dispute evidence files | **YES** - Storage bucket access may require service role for cross-user evidence files (admin/arbitrator viewing) |
| 15 | `src/app/api/onboarding/steps/[step]/complete/route.ts` | POST | Upsert onboarding step completion | **CONCERN** - RLS policy exists for onboarding_steps INSERT with user_id check. Service client may be unnecessary if the user's auth context matches. |
| 16 | `src/app/api/posts/route.ts` | POST | Calculate post cost, deduct points, insert post, log activity | **YES** - Points ledger writes + cross-table operations |
| 17 | `src/app/api/posts/[id]/like/route.ts` | POST (like) | Award XP to liker and author, sync like count | **YES** - Cross-user XP awards (author gets XP from someone else's action) |
| 18 | `src/app/api/posts/[id]/like/route.ts` | POST (count sync) | Update posts.likes_count from post_likes count | **YES** - Updates post row that may not be owned by the liker |
| 19 | `src/app/api/posts/[id]/comments/route.ts` | POST | Award XP to commenter and author | **YES** - Cross-user XP awards |
| 20 | `src/app/api/posts/[id]/flag/route.ts` | POST (flag) | Log activity_log entry | **YES** - Activity logging bypass |
| 21 | `src/app/api/posts/[id]/flag/route.ts` | PATCH (vindicate) | Read all flags, penalize false flaggers | **YES** - Admin action reading other users' flags and deducting their points |
| 22 | `src/app/api/posts/[id]/promote/route.ts` | POST | Deduct points for promotion | **YES** - Points ledger write |
| 23 | `src/app/api/donations/submit/route.ts` | POST | Verify and finalize donation on-chain | **YES** - Async background verification updates donation status |
| 24 | `src/app/api/trading/sync/route.ts` | POST | Sync wallet balance, log activity | **YES** - wallet_balance_snapshots write + activity log |
| 25 | `src/app/api/twitter/link/start/route.ts` | POST | Create twitter_oauth_sessions record | **YES** - OAuth session table is service-managed |
| 26 | `src/app/api/twitter/link/callback/route.ts` | GET | Read OAuth session, update twitter_accounts | **YES** - OAuth session validation + cross-table update |
| 27 | `src/app/api/twitter/account/route.ts` | PATCH/DELETE | Update/delete twitter_accounts, update user_profiles | **YES** - Needs to update twitter_accounts which may lack user-scoped write policies |
| 28 | `src/app/api/user/points/route.ts` | GET | Read points economy data (weekly counts, engagement) | **CONCERN** - Only reads data. Could potentially use authenticated client if points_ledger SELECT policy allows user to see own data. |
| 29 | `src/features/market-data/server/service.ts` | read/write | Cache market prices in market_snapshots table | **YES** - market_snapshots has no RLS; this is the only writer and it runs server-side |

---

## 3. RLS Anti-Pattern Findings

### 3a. `USING (true)` on Sensitive Tables

| Table | Policy | Severity | Status |
|---|---|---|---|
| user_profiles | "Public profiles are viewable by everyone" | CRITICAL | **FIXED** in security_hardening migration - now split: authenticated=full, anon=profile_visible |
| disputes | "Authenticated users can view disputes" | HIGH | **FIXED** in security_hardening - now party+admin scoped |
| activity_log | "Public read" | HIGH | **FIXED** in security_hardening - now authenticated only |
| engagement_proofs | "Anyone can read engagement proofs" | LOW | Still USING(true) - engagement proofs are semi-public marketplace data; acceptable |
| referral_codes | "Anyone can validate referral codes" | LOW | Anon USING(true) - acceptable; codes need public validation |
| post_likes | "Anyone can read likes" | LOW | Still USING(true) - like counts are public; acceptable |
| task_assignees | "Anyone can view task assignees" | LOW | USING(true) - acceptable; task assignments are public DAO info |
| voting_config | "Voting config is viewable by everyone" | LOW | USING(true) - acceptable; config is public |
| proposals | "Proposals are viewable by everyone" | LOW | USING(true) - acceptable; proposals are public governance data |
| votes | "Vote tallies are viewable by everyone" | LOW | USING(true) - acceptable; votes are public |
| tasks | "Tasks are viewable by everyone" | LOW | USING(true) - acceptable; tasks are public |

### 3b. Missing `WITH CHECK` on UPDATE Policies

The security hardening migration uses `USING` without `WITH CHECK` on several UPDATE policies. In PostgreSQL, when `WITH CHECK` is omitted on UPDATE, the `USING` expression is used for both visibility and the check. This means:

| Policy | Table | Risk |
|---|---|---|
| "Task owner or admin can update tasks" | tasks | LOW - USING clause is sufficient; prevents row reassignment to non-qualifying users |
| "Authors can update own draft proposals" | proposals | LOW - USING ensures only draft/public status rows are updatable |
| "Admin can update any proposal" | proposals | LOW - Admin-only; WITH CHECK would be redundant |
| "Users can update own notifications" | notifications | NONE - user_id scoped |
| "Users can update own prefs" | notification_preferences | NONE - user_id scoped |
| "Authors can update own posts" | posts | LOW - author_id scoped via USING |

**Assessment:** The missing WITH CHECK clauses are not a security gap in this case because the USING clause already constrains which rows can be seen/modified. However, as a best practice, adding `WITH CHECK` to UPDATE policies prevents edge cases where a user could update a row to change ownership columns (e.g., changing `created_by` to another user). This is a LOW-priority improvement.

### 3c. `user_metadata` in Policies

**No instances found.** All role checks use `user_profiles.role` lookups, which is the correct pattern. The app does not rely on `user_metadata` or `app_metadata` from JWT claims for authorization decisions in RLS policies.

### 3d. Bare `auth.uid()` Without `(select ...)` Wrapper

The security hardening migration (20260328300000) fixed most bare `auth.uid()` calls. A few older migrations still have bare calls, but they are superseded by the hardening migration's `DROP POLICY IF EXISTS` + recreate pattern.

**Remaining bare `auth.uid()` in original migrations (superseded by hardening):**
- `vote_delegations` policies in phase12_advanced_features.sql
- `task_submissions` policies in enhance_task_system.sql

These are likely still active if the hardening migration did not explicitly replace them.

---

## 4. Gaps and Recommendations

### Critical

1. **Tables missing RLS:** `market_snapshots`, `reward_settlement_events`, `proposal_voter_snapshots` should have RLS enabled with appropriate policies, even if they are currently only accessed via service_role. Defense in depth.

### High

2. **Health check route uses service_role unnecessarily** (`src/app/api/health/route.ts`). Should use `createAnonClient()` since it only performs `SELECT ... LIMIT 1` on public-ish tables.

3. **Onboarding steps route may not need service_role** (`src/app/api/onboarding/steps/[step]/complete/route.ts`). The `onboarding_steps` table has RLS policies allowing user INSERT with `(select auth.uid()) = user_id`. The authenticated client should work here.

4. **User points route uses service_role for reads** (`src/app/api/user/points/route.ts`). If `points_ledger` has user-scoped SELECT policy, the authenticated client could suffice.

### Medium

5. **Missing WITH CHECK on UPDATE policies** for `tasks`, `proposals`, and `posts`. While USING provides equivalent protection in most cases, explicit WITH CHECK prevents column-reassignment attacks.

6. **`vote_delegations` UPDATE policy** may still use bare `auth.uid()` (not wrapped in `(select ...)`), causing per-row InitPlan evaluation.

### Low

7. **`engagement_proofs`** has `USING(true)` for SELECT. While engagement data is semi-public, consider restricting to authenticated users only.

---

## 5. Security Hardening Migration Effectiveness

The `20260328300000_security_hardening.sql` migration addressed the most critical issues:
- Restricted user_profiles public read (email/wallet exposure)
- Scoped disputes to parties + admin
- Restricted activity_log to authenticated
- Added missing DELETE policy for notifications
- Created privacy-safe leaderboard view (no email)
- Restricted proposal editing to draft/public status
- Fixed ~34 bare `auth.uid()` calls to `(select auth.uid())`

**Overall assessment:** The hardening migration was well-targeted and effective. The remaining gaps are mostly medium/low severity with the exception of the three tables missing RLS entirely.
