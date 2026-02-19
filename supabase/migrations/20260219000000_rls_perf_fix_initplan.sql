-- ===========================================================================
-- Migration: RLS auth_rls_initplan Performance Fix
-- Purpose:   Wrap all auth.uid() calls inside (SELECT auth.uid()) so Postgres
--            evaluates the session UID exactly once per query (initplan) rather
--            than once per row scanned.
--
-- Impact:    Zero change to access rules — only the evaluation timing changes.
--            Expected gain: 10–100x faster for any filtered query on growing
--            tables (tasks, submissions, proposals, disputes, notifications…).
--
-- Pattern:
--   BEFORE: USING (auth.uid() = user_id)          -- evaluated per row
--   AFTER:  USING ((SELECT auth.uid()) = user_id)  -- evaluated once per query
--
-- Approval:  User explicitly approved RLS policy modifications on 2026-02-19.
-- ===========================================================================


-- ─── user_profiles ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;
CREATE POLICY "Admins can update any profile"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );


-- ─── proposals ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can create proposals" ON public.proposals;
CREATE POLICY "Members can create proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = created_by AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('member', 'council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Authors can update own proposals" ON public.proposals;
CREATE POLICY "Authors can update own proposals"
  ON public.proposals FOR UPDATE
  USING ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS "Admins can update any proposal" ON public.proposals;
CREATE POLICY "Admins can update any proposal"
  ON public.proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Authors can delete own draft proposals" ON public.proposals;
CREATE POLICY "Authors can delete own draft proposals"
  ON public.proposals FOR DELETE
  USING ((SELECT auth.uid()) = created_by AND status = 'draft');

DROP POLICY IF EXISTS "Admins can delete any proposal" ON public.proposals;
CREATE POLICY "Admins can delete any proposal"
  ON public.proposals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );


-- ─── votes ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can vote" ON public.votes;
CREATE POLICY "Members can vote"
  ON public.votes FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = voter_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('member', 'council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Members can update their own votes" ON public.votes;
CREATE POLICY "Members can update their own votes"
  ON public.votes FOR UPDATE
  USING (
    (SELECT auth.uid()) = voter_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('member', 'council', 'admin')
    )
  );


-- ─── tasks ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
CREATE POLICY "Members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('member', 'council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
CREATE POLICY "Members can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('member', 'council', 'admin')
    )
  );


-- ─── sprints ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Council can manage sprints" ON public.sprints;
CREATE POLICY "Council can manage sprints"
  ON public.sprints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('council', 'admin')
    )
  );


-- ─── comments ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment"
  ON public.comments FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ─── holder_snapshots ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Only admins can create snapshots" ON public.holder_snapshots;
CREATE POLICY "Only admins can create snapshots"
  ON public.holder_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );


-- ─── orgs ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Only admins can manage orgs" ON public.orgs;
CREATE POLICY "Only admins can manage orgs"
  ON public.orgs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );


-- ─── task_comments ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.task_comments;
CREATE POLICY "Authenticated users can create comments"
  ON public.task_comments FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
CREATE POLICY "Users can update their own comments"
  ON public.task_comments FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.task_comments FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ─── task_submissions ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.task_submissions;
CREATE POLICY "Users can view their own submissions"
  ON public.task_submissions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins and council can view all submissions" ON public.task_submissions;
CREATE POLICY "Admins and council can view all submissions"
  ON public.task_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create submissions" ON public.task_submissions;
CREATE POLICY "Authenticated users can create submissions"
  ON public.task_submissions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own pending submissions" ON public.task_submissions;
CREATE POLICY "Users can update their own pending submissions"
  ON public.task_submissions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id AND review_status = 'pending');

DROP POLICY IF EXISTS "Admins and council can update any submission" ON public.task_submissions;
CREATE POLICY "Admins and council can update any submission"
  ON public.task_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );


-- ─── task_assignees ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users with organic_id can claim tasks" ON public.task_assignees;
CREATE POLICY "Authenticated users with organic_id can claim tasks"
  ON public.task_assignees FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.organic_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can unclaim their own tasks" ON public.task_assignees;
CREATE POLICY "Users can unclaim their own tasks"
  ON public.task_assignees FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ─── task_likes ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can like tasks" ON public.task_likes;
CREATE POLICY "Members can like tasks"
  ON public.task_likes FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('member', 'council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can remove own likes" ON public.task_likes;
CREATE POLICY "Users can remove own likes"
  ON public.task_likes FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ─── voting_config ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Only admins can manage voting config" ON public.voting_config;
CREATE POLICY "Only admins can manage voting config"
  ON public.voting_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );


-- ─── task_dependencies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dependencies are viewable by authenticated users" ON public.task_dependencies;
CREATE POLICY "Dependencies are viewable by authenticated users"
  ON public.task_dependencies FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Council and admin can manage dependencies" ON public.task_dependencies;
CREATE POLICY "Council and admin can manage dependencies"
  ON public.task_dependencies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Task creator can manage dependencies" ON public.task_dependencies;
CREATE POLICY "Task creator can manage dependencies"
  ON public.task_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_dependencies.task_id AND created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Task creator can remove dependencies" ON public.task_dependencies;
CREATE POLICY "Task creator can remove dependencies"
  ON public.task_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_dependencies.task_id AND created_by = (SELECT auth.uid())
    )
  );


-- ─── task_templates ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Templates are viewable by authenticated users" ON public.task_templates;
CREATE POLICY "Templates are viewable by authenticated users"
  ON public.task_templates FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Council and admin can manage templates" ON public.task_templates;
CREATE POLICY "Council and admin can manage templates"
  ON public.task_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );


-- ─── recurring_task_instances ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Recurring instances viewable by authenticated users" ON public.recurring_task_instances;
CREATE POLICY "Recurring instances viewable by authenticated users"
  ON public.recurring_task_instances FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Council and admin can manage recurring instances" ON public.recurring_task_instances;
CREATE POLICY "Council and admin can manage recurring instances"
  ON public.recurring_task_instances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );


-- ─── vote_delegations ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Delegations are viewable by authenticated users" ON public.vote_delegations;
CREATE POLICY "Delegations are viewable by authenticated users"
  ON public.vote_delegations FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can create their own delegations" ON public.vote_delegations;
CREATE POLICY "Users can create their own delegations"
  ON public.vote_delegations FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = delegator_id);

DROP POLICY IF EXISTS "Users can update their own delegations" ON public.vote_delegations;
CREATE POLICY "Users can update their own delegations"
  ON public.vote_delegations FOR UPDATE
  USING ((SELECT auth.uid()) = delegator_id);

DROP POLICY IF EXISTS "Users can revoke their own delegations" ON public.vote_delegations;
CREATE POLICY "Users can revoke their own delegations"
  ON public.vote_delegations FOR DELETE
  USING ((SELECT auth.uid()) = delegator_id);


-- ─── user_follows ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own follows" ON public.user_follows;
CREATE POLICY "Users can view own follows"
  ON public.user_follows FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own follows" ON public.user_follows;
CREATE POLICY "Users can insert own follows"
  ON public.user_follows FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON public.user_follows;
CREATE POLICY "Users can delete own follows"
  ON public.user_follows FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ─── notifications ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);


-- ─── notification_preferences ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own prefs" ON public.notification_preferences;
CREATE POLICY "Users can view own prefs"
  ON public.notification_preferences FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own prefs" ON public.notification_preferences;
CREATE POLICY "Users can insert own prefs"
  ON public.notification_preferences FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own prefs" ON public.notification_preferences;
CREATE POLICY "Users can update own prefs"
  ON public.notification_preferences FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);


-- ─── notification_batches ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own notification batches" ON public.notification_batches;
CREATE POLICY "Users can view own notification batches"
  ON public.notification_batches FOR SELECT
  USING ((SELECT auth.uid()) = user_id);


-- ─── notification_batch_events ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own notification batch events" ON public.notification_batch_events;
CREATE POLICY "Users can view own notification batch events"
  ON public.notification_batch_events FOR SELECT
  USING ((SELECT auth.uid()) = user_id);


-- ─── reward_claims ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own reward claims" ON public.reward_claims;
CREATE POLICY "Users can view own reward claims"
  ON public.reward_claims FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins and council can view all reward claims" ON public.reward_claims;
CREATE POLICY "Admins and council can view all reward claims"
  ON public.reward_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Users can create own reward claims" ON public.reward_claims;
CREATE POLICY "Users can create own reward claims"
  ON public.reward_claims FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can update reward claims" ON public.reward_claims;
CREATE POLICY "Admins can update reward claims"
  ON public.reward_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );


-- ─── reward_distributions ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own reward distributions" ON public.reward_distributions;
CREATE POLICY "Users can view own reward distributions"
  ON public.reward_distributions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins and council can view all reward distributions" ON public.reward_distributions;
CREATE POLICY "Admins and council can view all reward distributions"
  ON public.reward_distributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Admins can create reward distributions" ON public.reward_distributions;
CREATE POLICY "Admins can create reward distributions"
  ON public.reward_distributions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );


-- ─── disputes ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Disputant can create disputes" ON public.disputes;
CREATE POLICY "Disputant can create disputes"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = disputant_id);

DROP POLICY IF EXISTS "Parties and arbitrators can update disputes" ON public.disputes;
CREATE POLICY "Parties and arbitrators can update disputes"
  ON public.disputes FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = disputant_id
    OR (SELECT auth.uid()) = reviewer_id
    OR (SELECT auth.uid()) = arbitrator_id
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );


-- ─── dispute_comments ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can view comments" ON public.dispute_comments;
CREATE POLICY "Dispute parties can view comments"
  ON public.dispute_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_id
        AND (
          (SELECT auth.uid()) = d.disputant_id
          OR (SELECT auth.uid()) = d.reviewer_id
          OR (SELECT auth.uid()) = d.arbitrator_id
          OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Dispute parties can add comments" ON public.dispute_comments;
CREATE POLICY "Dispute parties can add comments"
  ON public.dispute_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_id
        AND (
          (SELECT auth.uid()) = d.disputant_id
          OR (SELECT auth.uid()) = d.reviewer_id
          OR (SELECT auth.uid()) = d.arbitrator_id
          OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
          )
        )
    )
  );


-- ─── twitter_accounts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own twitter accounts" ON public.twitter_accounts;
CREATE POLICY "Users can read own twitter accounts"
  ON public.twitter_accounts FOR SELECT
  USING ((SELECT auth.uid()) = user_id);


-- ─── twitter_engagement_tasks ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins and council can manage twitter engagement tasks" ON public.twitter_engagement_tasks;
CREATE POLICY "Admins and council can manage twitter engagement tasks"
  ON public.twitter_engagement_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );


-- ─── twitter_engagement_submissions ───────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own twitter engagement submissions" ON public.twitter_engagement_submissions;
CREATE POLICY "Users can read own twitter engagement submissions"
  ON public.twitter_engagement_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.task_submissions
      WHERE task_submissions.id = twitter_engagement_submissions.submission_id
        AND task_submissions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and council can read all twitter engagement submissions" ON public.twitter_engagement_submissions;
CREATE POLICY "Admins and council can read all twitter engagement submissions"
  ON public.twitter_engagement_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );
