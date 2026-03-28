-- Security hardening migration: RLS tightening, privacy fixes,
-- missing DELETE policies, and dispute visibility scoping.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. CRITICAL: Restrict tasks UPDATE to owner/assignee/admin
--    Previously ANY member could update ANY task (points, status, assignee).
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Members can update tasks" on tasks;

create policy "Task owner or admin can update tasks"
  on tasks for update
  using (
    (select auth.uid()) = created_by
    or (select auth.uid()) = assignee_id
    or exists (
      select 1 from user_profiles
      where id = (select auth.uid())
      and role in ('council', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 2. CRITICAL: Restrict user_profiles public read to hide email/wallet
--    Old policy: USING (true) exposed emails to unauthenticated users.
--    New: authenticated users see full profiles; anon sees only public fields.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Public profiles are viewable by everyone" on user_profiles;

-- Authenticated users can see all profiles (RLS still applies per-row)
create policy "Authenticated users can view profiles"
  on user_profiles for select
  to authenticated
  using (true);

-- Anonymous users can only see profiles marked visible (no email/wallet via view)
create policy "Anon can view public profiles"
  on user_profiles for select
  to anon
  using (profile_visible = true);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. HIGH: Restrict dispute visibility to parties + admin/council
--    Previously ALL authenticated users could see ALL disputes including
--    private evidence, stakes, and resolution details.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Authenticated users can view disputes" on disputes;

create policy "Dispute parties and admins can view disputes"
  on disputes for select
  to authenticated
  using (
    (select auth.uid()) = disputant_id
    or (select auth.uid()) = reviewer_id
    or (select auth.uid()) = arbitrator_id
    or exists (
      select 1 from user_profiles
      where id = (select auth.uid())
      and role in ('council', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 4. HIGH: Restrict activity_log to authenticated users only
--    Was publicly readable — exposes user engagement patterns.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Public read" on activity_log;

create policy "Authenticated users can read activity log"
  on activity_log for select
  to authenticated
  using (true);

-- ═══════════════════════════════════════════════════════════════════════
-- 5. MEDIUM: Add missing DELETE policies
-- ═══════════════════════════════════════════════════════════════════════

-- Notifications: users can delete their own
create policy "Users can delete own notifications"
  on notifications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. HIGH: Create a privacy-safe leaderboard view
--    The existing view exposes email addresses publicly.
--    Replace with a view that excludes PII.
-- ═══════════════════════════════════════════════════════════════════════

-- Drop and recreate the materialized view without email
drop materialized view if exists leaderboard_materialized cascade;

create materialized view leaderboard_materialized as
select
  up.id,
  up.name,
  up.organic_id,
  up.avatar_url,
  up.role,
  up.level,
  up.xp_total,
  up.total_points,
  up.tasks_completed,
  up.current_streak,
  row_number() over (order by up.xp_total desc, up.total_points desc, up.tasks_completed desc) as rank,
  dense_rank() over (order by up.xp_total desc) as dense_rank
from user_profiles up
where up.organic_id is not null
order by up.xp_total desc;

-- Index for fast lookups
create unique index if not exists idx_leaderboard_materialized_id
  on leaderboard_materialized (id);

create index if not exists idx_leaderboard_materialized_rank
  on leaderboard_materialized (rank);

-- Grant read to authenticated only (not anon)
revoke all on leaderboard_materialized from anon;
grant select on leaderboard_materialized to authenticated;

-- Refresh the view with current data
refresh materialized view leaderboard_materialized;

-- ═══════════════════════════════════════════════════════════════════════
-- 7. MEDIUM: Restrict proposal editing after submission
--    Authors should only edit drafts, not proposals in voting/finalized.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Authors can update own proposals" on proposals;

create policy "Authors can update own draft proposals"
  on proposals for update
  using (
    (select auth.uid()) = created_by
    and status in ('draft', 'public')
  );

-- Admin/council can update any proposal (for moderation)
create policy "Admin can update any proposal"
  on proposals for update
  using (
    exists (
      select 1 from user_profiles
      where id = (select auth.uid())
      and role in ('council', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 8. PERF: Fix remaining bare auth.uid() → (select auth.uid())
--    Bare auth.uid() causes per-row InitPlan evaluation instead of
--    one-time cached evaluation. Only notifications_system policies remain.
-- ═══════════════════════════════════════════════════════════════════════

-- user_follows
drop policy if exists "Users can view own follows" on user_follows;
drop policy if exists "Users can insert own follows" on user_follows;
drop policy if exists "Users can delete own follows" on user_follows;

create policy "Users can view own follows" on user_follows
  for select using ((select auth.uid()) = user_id);
create policy "Users can insert own follows" on user_follows
  for insert with check ((select auth.uid()) = user_id);
create policy "Users can delete own follows" on user_follows
  for delete using ((select auth.uid()) = user_id);

-- notifications (SELECT + UPDATE already exist; recreate with wrapper)
drop policy if exists "Users can view own notifications" on notifications;
drop policy if exists "Users can update own notifications" on notifications;

create policy "Users can view own notifications" on notifications
  for select using ((select auth.uid()) = user_id);
create policy "Users can update own notifications" on notifications
  for update using ((select auth.uid()) = user_id);

-- notification_preferences
drop policy if exists "Users can view own prefs" on notification_preferences;
drop policy if exists "Users can insert own prefs" on notification_preferences;
drop policy if exists "Users can update own prefs" on notification_preferences;

create policy "Users can view own prefs" on notification_preferences
  for select using ((select auth.uid()) = user_id);
create policy "Users can insert own prefs" on notification_preferences
  for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own prefs" on notification_preferences
  for update using ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 9. PERF: Fix bare auth.uid() on remaining tables (34 policies total)
--    Tables: proposal_versions, proposal_stage_events, proposal_templates,
--    dispute_evidence_events, onboarding_steps, user_achievement_progress,
--    posts, post_thread_parts, post_likes, post_flags, donations,
--    wallet_balance_snapshots, boost_requests, engagement_proofs,
--    points_escrow, points_ledger, storage.objects (avatars + evidence)
-- ═══════════════════════════════════════════════════════════════════════

-- proposal_versions
drop policy if exists "Authenticated users can insert proposal versions" on proposal_versions;
create policy "Authenticated users can insert proposal versions" on proposal_versions
  for insert with check (created_by = (select auth.uid()));

-- proposal_stage_events
drop policy if exists "Authenticated users can insert proposal stage events" on proposal_stage_events;
create policy "Authenticated users can insert proposal stage events" on proposal_stage_events
  for insert with check (actor_id = (select auth.uid()));

-- proposal_templates
drop policy if exists "Only admins/council can manage proposal templates" on proposal_templates;
create policy "Only admins/council can manage proposal templates" on proposal_templates
  for all using (
    exists (
      select 1 from user_profiles
      where id = (select auth.uid()) and role in ('admin', 'council')
    )
  );

-- onboarding_steps
drop policy if exists "Users can read own onboarding steps" on onboarding_steps;
drop policy if exists "Users can insert own onboarding steps" on onboarding_steps;
create policy "Users can read own onboarding steps" on onboarding_steps
  for select using ((select auth.uid()) = user_id);
create policy "Users can insert own onboarding steps" on onboarding_steps
  for insert with check ((select auth.uid()) = user_id);

-- user_achievement_progress
drop policy if exists "user_achievement_progress_read_own" on user_achievement_progress;
create policy "user_achievement_progress_read_own" on user_achievement_progress
  for select using (user_id = (select auth.uid()) or exists (
    select 1 from user_profiles where id = user_id and profile_visible = true
  ));

-- posts
drop policy if exists "Anyone can read published posts" on posts;
drop policy if exists "Authenticated users can create posts" on posts;
drop policy if exists "Authors can update own posts" on posts;
create policy "Anyone can read published posts" on posts
  for select using (status = 'published' or author_id = (select auth.uid()));
create policy "Authenticated users can create posts" on posts
  for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Authors can update own posts" on posts
  for update using ((select auth.uid()) = author_id);

-- post_thread_parts
drop policy if exists "Anyone can read thread parts" on post_thread_parts;
drop policy if exists "Authors can manage thread parts" on post_thread_parts;
create policy "Anyone can read thread parts" on post_thread_parts
  for select using (
    exists (
      select 1 from posts
      where posts.id = post_thread_parts.post_id
      and (posts.status = 'published' or posts.author_id = (select auth.uid()))
    )
  );
create policy "Authors can manage thread parts" on post_thread_parts
  for all using (
    exists (
      select 1 from posts
      where posts.id = post_thread_parts.post_id
      and posts.author_id = (select auth.uid())
    )
  );

-- post_likes
drop policy if exists "Users can manage own likes" on post_likes;
drop policy if exists "Users can delete own likes" on post_likes;
create policy "Users can manage own likes" on post_likes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can delete own likes" on post_likes
  for delete using ((select auth.uid()) = user_id);

-- post_flags
drop policy if exists "Users can view own flags" on post_flags;
drop policy if exists "Users can flag posts" on post_flags;
drop policy if exists "Admins can view all flags" on post_flags;
drop policy if exists "Admins can delete flags" on post_flags;
create policy "Users can view own flags" on post_flags
  for select using (user_id = (select auth.uid()));
create policy "Users can flag posts" on post_flags
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Admins can view all flags" on post_flags
  for select using (
    exists (select 1 from user_profiles where id = (select auth.uid()) and role = 'admin')
  );
create policy "Admins can delete flags" on post_flags
  for delete using (
    exists (select 1 from user_profiles where id = (select auth.uid()) and role = 'admin')
  );

-- donations
drop policy if exists "donations_select_own" on donations;
drop policy if exists "donations_insert_own" on donations;
create policy "donations_select_own" on donations
  for select using (donor_id = (select auth.uid()));
create policy "donations_insert_own" on donations
  for insert with check (donor_id = (select auth.uid()));

-- wallet_balance_snapshots
drop policy if exists "snapshots_select_own" on wallet_balance_snapshots;
drop policy if exists "snapshots_insert_service" on wallet_balance_snapshots;
create policy "snapshots_select_own" on wallet_balance_snapshots
  for select using (user_id = (select auth.uid()));
create policy "snapshots_insert_service" on wallet_balance_snapshots
  for insert with check (user_id = (select auth.uid()));

-- boost_requests
drop policy if exists "Anyone can read active boost requests" on boost_requests;
drop policy if exists "Users can create own boost requests" on boost_requests;
create policy "Anyone can read active boost requests" on boost_requests
  for select using (status = 'active' or user_id = (select auth.uid()));
create policy "Users can create own boost requests" on boost_requests
  for insert to authenticated with check (user_id = (select auth.uid()));

-- engagement_proofs
drop policy if exists "Users can create own engagement proofs" on engagement_proofs;
create policy "Users can create own engagement proofs" on engagement_proofs
  for insert to authenticated with check (engager_id = (select auth.uid()));

-- points_escrow
drop policy if exists "Users can read own escrow" on points_escrow;
create policy "Users can read own escrow" on points_escrow
  for select using (user_id = (select auth.uid()));

-- points_ledger
drop policy if exists "Users can view own ledger" on points_ledger;
create policy "Users can view own ledger" on points_ledger
  for select using (user_id = (select auth.uid()));

-- dispute_evidence_events
drop policy if exists "Dispute evidence events are viewable by parties" on dispute_evidence_events;
drop policy if exists "Dispute evidence events are insertable by parties" on dispute_evidence_events;
create policy "Dispute evidence events are viewable by parties" on dispute_evidence_events
  for select using (
    exists (
      select 1 from disputes d
      where d.id = dispute_evidence_events.dispute_id
      and (
        d.disputant_id = (select auth.uid())
        or d.reviewer_id = (select auth.uid())
        or d.arbitrator_id = (select auth.uid())
        or exists (select 1 from user_profiles where id = (select auth.uid()) and role in ('admin', 'council'))
      )
    )
  );
create policy "Dispute evidence events are insertable by parties" on dispute_evidence_events
  for insert with check (
    actor_id = (select auth.uid())
    and exists (
      select 1 from disputes d
      where d.id = dispute_evidence_events.dispute_id
      and (
        d.disputant_id = (select auth.uid())
        or d.reviewer_id = (select auth.uid())
        or d.arbitrator_id = (select auth.uid())
        or exists (select 1 from user_profiles where id = (select auth.uid()) and role in ('admin', 'council'))
      )
    )
  );

-- storage.objects (avatars bucket)
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "Users can update their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "Users can delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- storage.objects (dispute-evidence bucket)
drop policy if exists "Users can view their dispute evidence" on storage.objects;
drop policy if exists "Users can upload their dispute evidence" on storage.objects;
drop policy if exists "Users can update their dispute evidence" on storage.objects;
drop policy if exists "Users can delete their dispute evidence" on storage.objects;
create policy "Users can view their dispute evidence" on storage.objects
  for select using (
    bucket_id = 'dispute-evidence'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "Users can upload their dispute evidence" on storage.objects
  for insert with check (
    bucket_id = 'dispute-evidence'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "Users can update their dispute evidence" on storage.objects
  for update using (
    bucket_id = 'dispute-evidence'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "Users can delete their dispute evidence" on storage.objects
  for delete using (
    bucket_id = 'dispute-evidence'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
