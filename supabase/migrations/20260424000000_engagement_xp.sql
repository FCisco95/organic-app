-- Migration: X Engagement Rewards (XER)
--
-- Adds domain tables for:
--   • allowlisted org X handles (engagement_handles)
--   • tracked posts from those handles (engagement_posts)
--   • per-user engagement submissions earning XP (engagement_submissions)
--   • lightweight DAO-vote appeals layer (engagement_appeals / _votes)
--   • scoring calibration samples for human spot-checks (engagement_calibration_samples)
--   • versioned few-shot rubric examples for the Claude scorer (engagement_rubric_examples)
--
-- Reuses existing infrastructure: user_profiles.organic_id gate, xp_events
-- deduplication (user_id, event_type, source_type, source_id), points_ledger,
-- sprints, disputes (for appeal escalation).

-- ─── Helper function: update_updated_at_column() is assumed present ──────

-- ─── engagement_handles ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS engagement_handles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  added_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  last_polled_at TIMESTAMPTZ,
  last_seen_tweet_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engagement_handles_handle_not_blank CHECK (length(trim(handle)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_engagement_handles_org_handle
  ON engagement_handles (org_id, lower(handle));

CREATE INDEX IF NOT EXISTS idx_engagement_handles_active
  ON engagement_handles (is_active) WHERE is_active;

-- ─── engagement_posts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS engagement_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle_id UUID NOT NULL REFERENCES engagement_handles(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL UNIQUE,
  posted_at TIMESTAMPTZ NOT NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  pool_size INTEGER NOT NULL DEFAULT 100,
  engagement_window_ends_at TIMESTAMPTZ NOT NULL,
  wave_config JSONB,
  is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  last_polled_at TIMESTAMPTZ,
  reply_pagination_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engagement_posts_tweet_id_numeric CHECK (tweet_id ~ '^[0-9]{5,25}$'),
  CONSTRAINT engagement_posts_pool_non_negative CHECK (pool_size >= 0),
  CONSTRAINT engagement_posts_window_after_post CHECK (engagement_window_ends_at > posted_at)
);

CREATE INDEX IF NOT EXISTS idx_engagement_posts_handle_id
  ON engagement_posts (handle_id);

CREATE INDEX IF NOT EXISTS idx_engagement_posts_sprint_id
  ON engagement_posts (sprint_id);

CREATE INDEX IF NOT EXISTS idx_engagement_posts_open_window
  ON engagement_posts (engagement_window_ends_at)
  WHERE is_excluded = FALSE;

-- ─── engagement_submissions ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS engagement_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES engagement_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  twitter_account_id UUID REFERENCES twitter_accounts(id) ON DELETE SET NULL,
  twitter_user_id TEXT NOT NULL,
  engagement_type twitter_engagement_type NOT NULL,
  engaged_at TIMESTAMPTZ NOT NULL,
  rank INTEGER NOT NULL,
  wave_multiplier NUMERIC(4,2) NOT NULL,
  comment_tweet_id TEXT,
  comment_text TEXT,
  comment_score INTEGER,
  comment_score_axes JSONB,
  comment_score_reasoning TEXT,
  comment_score_model TEXT,
  comment_score_version TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engagement_submissions_score_range CHECK (
    comment_score IS NULL OR (comment_score BETWEEN 1 AND 5)
  ),
  CONSTRAINT engagement_submissions_rank_positive CHECK (rank > 0),
  CONSTRAINT engagement_submissions_wave_positive CHECK (wave_multiplier > 0),
  CONSTRAINT engagement_submissions_comment_has_text CHECK (
    engagement_type <> 'comment' OR comment_text IS NOT NULL
  ),
  CONSTRAINT engagement_submissions_unique_per_user_post_type
    UNIQUE (post_id, user_id, engagement_type)
);

CREATE INDEX IF NOT EXISTS idx_engagement_submissions_user_id
  ON engagement_submissions (user_id);

CREATE INDEX IF NOT EXISTS idx_engagement_submissions_post_id
  ON engagement_submissions (post_id);

CREATE INDEX IF NOT EXISTS idx_engagement_submissions_post_type_rank
  ON engagement_submissions (post_id, engagement_type, rank);

-- ─── engagement_appeals (DAO-vote layer) ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engagement_appeal_status') THEN
    CREATE TYPE engagement_appeal_status AS ENUM (
      'open',
      'resolved_uphold',
      'resolved_overturn',
      'escalated_to_arbitrator',
      'expired_no_quorum'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS engagement_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES engagement_submissions(id) ON DELETE CASCADE,
  appellant_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  proposed_score INTEGER,
  status engagement_appeal_status NOT NULL DEFAULT 'open',
  vote_count_uphold INTEGER NOT NULL DEFAULT 0,
  vote_count_overturn INTEGER NOT NULL DEFAULT 0,
  vote_weight_uphold BIGINT NOT NULL DEFAULT 0,
  vote_weight_overturn BIGINT NOT NULL DEFAULT 0,
  voting_ends_at TIMESTAMPTZ NOT NULL,
  resolution_xp_delta INTEGER NOT NULL DEFAULT 0,
  arbitrator_dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engagement_appeals_reason_not_blank CHECK (length(trim(reason)) > 0),
  CONSTRAINT engagement_appeals_proposed_score_range CHECK (
    proposed_score IS NULL OR (proposed_score BETWEEN 1 AND 5)
  ),
  CONSTRAINT engagement_appeals_window_after_create CHECK (voting_ends_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_engagement_appeals_status
  ON engagement_appeals (status);

CREATE INDEX IF NOT EXISTS idx_engagement_appeals_voting_ends_at
  ON engagement_appeals (voting_ends_at) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_engagement_appeals_appellant
  ON engagement_appeals (appellant_id);

-- ─── engagement_appeal_votes ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS engagement_appeal_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id UUID NOT NULL REFERENCES engagement_appeals(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vote TEXT NOT NULL,
  vote_weight BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engagement_appeal_votes_vote_values CHECK (vote IN ('uphold', 'overturn')),
  CONSTRAINT engagement_appeal_votes_weight_non_negative CHECK (vote_weight >= 0),
  CONSTRAINT engagement_appeal_votes_unique_per_voter UNIQUE (appeal_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_appeal_votes_appeal_id
  ON engagement_appeal_votes (appeal_id);

-- ─── engagement_calibration_samples ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS engagement_calibration_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES engagement_submissions(id) ON DELETE CASCADE,
  ai_score INTEGER NOT NULL,
  human_score INTEGER,
  human_reviewer_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engagement_calibration_ai_score_range CHECK (ai_score BETWEEN 1 AND 5),
  CONSTRAINT engagement_calibration_human_score_range CHECK (
    human_score IS NULL OR (human_score BETWEEN 1 AND 5)
  ),
  CONSTRAINT engagement_calibration_review_consistency CHECK (
    (human_score IS NULL AND reviewed_at IS NULL AND human_reviewer_id IS NULL) OR
    (human_score IS NOT NULL AND reviewed_at IS NOT NULL AND human_reviewer_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_engagement_calibration_unreviewed
  ON engagement_calibration_samples (created_at) WHERE human_score IS NULL;

-- ─── engagement_rubric_examples (few-shot seed) ─────────────────────────

CREATE TABLE IF NOT EXISTS engagement_rubric_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment TEXT NOT NULL,
  ideal_score INTEGER NOT NULL,
  rationale TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  added_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engagement_rubric_examples_score_range CHECK (ideal_score BETWEEN 1 AND 5),
  CONSTRAINT engagement_rubric_examples_comment_not_blank CHECK (length(trim(comment)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_engagement_rubric_examples_active
  ON engagement_rubric_examples (is_active) WHERE is_active;

-- ─── RLS ────────────────────────────────────────────────────────────────

ALTER TABLE engagement_handles ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_appeal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_calibration_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_rubric_examples ENABLE ROW LEVEL SECURITY;

-- Handles: authenticated read, admin/council write
DROP POLICY IF EXISTS "Authenticated read engagement handles" ON engagement_handles;
CREATE POLICY "Authenticated read engagement handles"
  ON engagement_handles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin/council manage engagement handles" ON engagement_handles;
CREATE POLICY "Admin/council manage engagement handles"
  ON engagement_handles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Posts: authenticated read, admin/council write
DROP POLICY IF EXISTS "Authenticated read engagement posts" ON engagement_posts;
CREATE POLICY "Authenticated read engagement posts"
  ON engagement_posts FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin/council manage engagement posts" ON engagement_posts;
CREATE POLICY "Admin/council manage engagement posts"
  ON engagement_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Submissions: user reads own, admin/council reads all. Writes are server-side only.
DROP POLICY IF EXISTS "Users read own engagement submissions" ON engagement_submissions;
CREATE POLICY "Users read own engagement submissions"
  ON engagement_submissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin/council read all engagement submissions" ON engagement_submissions;
CREATE POLICY "Admin/council read all engagement submissions"
  ON engagement_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Appeals: user reads own, authenticated can read open appeals (to vote), admin read-all
DROP POLICY IF EXISTS "Users read own engagement appeals" ON engagement_appeals;
CREATE POLICY "Users read own engagement appeals"
  ON engagement_appeals FOR SELECT
  USING (auth.uid() = appellant_id);

DROP POLICY IF EXISTS "Authenticated read open engagement appeals" ON engagement_appeals;
CREATE POLICY "Authenticated read open engagement appeals"
  ON engagement_appeals FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'open');

DROP POLICY IF EXISTS "Admin/council read all engagement appeals" ON engagement_appeals;
CREATE POLICY "Admin/council read all engagement appeals"
  ON engagement_appeals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Appeal votes: voters read own, everyone reads counts via aggregate on appeals table.
DROP POLICY IF EXISTS "Voters read own engagement appeal votes" ON engagement_appeal_votes;
CREATE POLICY "Voters read own engagement appeal votes"
  ON engagement_appeal_votes FOR SELECT
  USING (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Admin/council read all engagement appeal votes" ON engagement_appeal_votes;
CREATE POLICY "Admin/council read all engagement appeal votes"
  ON engagement_appeal_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Calibration: admin/council only
DROP POLICY IF EXISTS "Admin/council manage calibration samples" ON engagement_calibration_samples;
CREATE POLICY "Admin/council manage calibration samples"
  ON engagement_calibration_samples FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- Rubric examples: authenticated read, admin/council write
DROP POLICY IF EXISTS "Authenticated read rubric examples" ON engagement_rubric_examples;
CREATE POLICY "Authenticated read rubric examples"
  ON engagement_rubric_examples FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = TRUE);

DROP POLICY IF EXISTS "Admin/council manage rubric examples" ON engagement_rubric_examples;
CREATE POLICY "Admin/council manage rubric examples"
  ON engagement_rubric_examples FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- ─── Updated-at triggers ────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_engagement_handles_updated_at ON engagement_handles;
CREATE TRIGGER set_engagement_handles_updated_at
  BEFORE UPDATE ON engagement_handles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_engagement_posts_updated_at ON engagement_posts;
CREATE TRIGGER set_engagement_posts_updated_at
  BEFORE UPDATE ON engagement_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_engagement_submissions_updated_at ON engagement_submissions;
CREATE TRIGGER set_engagement_submissions_updated_at
  BEFORE UPDATE ON engagement_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_engagement_appeals_updated_at ON engagement_appeals;
CREATE TRIGGER set_engagement_appeals_updated_at
  BEFORE UPDATE ON engagement_appeals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Grants ─────────────────────────────────────────────────────────────

REVOKE ALL ON TABLE engagement_handles FROM anon;
REVOKE ALL ON TABLE engagement_posts FROM anon;
REVOKE ALL ON TABLE engagement_submissions FROM anon;
REVOKE ALL ON TABLE engagement_appeals FROM anon;
REVOKE ALL ON TABLE engagement_appeal_votes FROM anon;
REVOKE ALL ON TABLE engagement_calibration_samples FROM anon;
REVOKE ALL ON TABLE engagement_rubric_examples FROM anon;

GRANT SELECT ON TABLE engagement_handles TO authenticated;
GRANT SELECT ON TABLE engagement_posts TO authenticated;
GRANT SELECT ON TABLE engagement_submissions TO authenticated;
GRANT SELECT ON TABLE engagement_appeals TO authenticated;
GRANT SELECT ON TABLE engagement_appeal_votes TO authenticated;
GRANT SELECT ON TABLE engagement_rubric_examples TO authenticated;
