-- Migration: Twitter/X engagement verification foundation
-- Adds OAuth account linking, Twitter task metadata, and Twitter submission evidence tables.

ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'twitter';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'twitter_engagement_type') THEN
    CREATE TYPE twitter_engagement_type AS ENUM ('like', 'retweet', 'comment');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'twitter_verification_method') THEN
    CREATE TYPE twitter_verification_method AS ENUM ('api_auto', 'screenshot', 'manual', 'ai_scored');
  END IF;
END
$$;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS twitter_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS twitter_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  twitter_user_id TEXT NOT NULL,
  twitter_username TEXT NOT NULL,
  display_name TEXT,
  profile_image_url TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT twitter_accounts_twitter_user_id_not_blank CHECK (length(trim(twitter_user_id)) > 0),
  CONSTRAINT twitter_accounts_username_not_blank CHECK (length(trim(twitter_username)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_twitter_accounts_user_active
  ON twitter_accounts(user_id)
  WHERE is_active;

CREATE UNIQUE INDEX IF NOT EXISTS idx_twitter_accounts_twitter_user_active
  ON twitter_accounts(twitter_user_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_twitter_accounts_user_id
  ON twitter_accounts(user_id);

CREATE TABLE IF NOT EXISTS twitter_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT twitter_oauth_sessions_state_not_blank CHECK (length(trim(state)) > 0),
  CONSTRAINT twitter_oauth_sessions_verifier_not_blank CHECK (length(trim(code_verifier)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_twitter_oauth_sessions_user_id
  ON twitter_oauth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_twitter_oauth_sessions_expires_at
  ON twitter_oauth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS twitter_engagement_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  engagement_type twitter_engagement_type NOT NULL,
  target_tweet_url TEXT NOT NULL,
  target_tweet_id TEXT NOT NULL,
  auto_verify BOOLEAN NOT NULL DEFAULT FALSE,
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
  requires_ai_review BOOLEAN NOT NULL DEFAULT FALSE,
  verification_window_hours INTEGER NOT NULL DEFAULT 168,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT twitter_engagement_tasks_task_id_unique UNIQUE (task_id),
  CONSTRAINT twitter_engagement_tasks_tweet_url_not_blank CHECK (length(trim(target_tweet_url)) > 0),
  CONSTRAINT twitter_engagement_tasks_tweet_id_numeric CHECK (target_tweet_id ~ '^[0-9]{5,25}$'),
  CONSTRAINT twitter_engagement_tasks_window_positive CHECK (verification_window_hours > 0),
  CONSTRAINT twitter_engagement_tasks_auto_approve_requires_verify CHECK (
    auto_approve = FALSE OR auto_verify = TRUE
  ),
  CONSTRAINT twitter_engagement_tasks_comment_requires_ai CHECK (
    engagement_type <> 'comment' OR requires_ai_review = TRUE
  ),
  CONSTRAINT twitter_engagement_tasks_comment_no_auto_approve CHECK (
    engagement_type <> 'comment' OR auto_approve = FALSE
  )
);

CREATE INDEX IF NOT EXISTS idx_twitter_engagement_tasks_target_tweet_id
  ON twitter_engagement_tasks(target_tweet_id);

CREATE TABLE IF NOT EXISTS twitter_engagement_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES task_submissions(id) ON DELETE CASCADE,
  twitter_account_id UUID REFERENCES twitter_accounts(id) ON DELETE SET NULL,
  engagement_type twitter_engagement_type NOT NULL,
  target_tweet_id TEXT NOT NULL,
  verification_method twitter_verification_method NOT NULL DEFAULT 'manual',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  screenshot_url TEXT,
  comment_text TEXT,
  ai_score INTEGER CHECK (ai_score >= 1 AND ai_score <= 5),
  ai_feedback TEXT,
  api_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT twitter_engagement_submissions_submission_id_unique UNIQUE (submission_id),
  CONSTRAINT twitter_engagement_submissions_tweet_id_numeric CHECK (target_tweet_id ~ '^[0-9]{5,25}$'),
  CONSTRAINT twitter_engagement_submissions_comment_required CHECK (
    engagement_type <> 'comment' OR comment_text IS NOT NULL
  ),
  CONSTRAINT twitter_engagement_submissions_verified_at_required CHECK (
    verified = FALSE OR verified_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_twitter_engagement_submissions_submission_id
  ON twitter_engagement_submissions(submission_id);

CREATE INDEX IF NOT EXISTS idx_twitter_engagement_submissions_account_id
  ON twitter_engagement_submissions(twitter_account_id);

CREATE INDEX IF NOT EXISTS idx_twitter_engagement_submissions_target_tweet_id
  ON twitter_engagement_submissions(target_tweet_id);

CREATE INDEX IF NOT EXISTS idx_twitter_engagement_submissions_verified
  ON twitter_engagement_submissions(verified);

CREATE INDEX IF NOT EXISTS idx_twitter_engagement_submissions_verified_by
  ON twitter_engagement_submissions(verified_by);

ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_engagement_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_engagement_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own twitter accounts" ON twitter_accounts;
CREATE POLICY "Users can read own twitter accounts"
  ON twitter_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read twitter engagement tasks" ON twitter_engagement_tasks;
CREATE POLICY "Authenticated users can read twitter engagement tasks"
  ON twitter_engagement_tasks FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and council can manage twitter engagement tasks" ON twitter_engagement_tasks;
CREATE POLICY "Admins and council can manage twitter engagement tasks"
  ON twitter_engagement_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Users can read own twitter engagement submissions" ON twitter_engagement_submissions;
CREATE POLICY "Users can read own twitter engagement submissions"
  ON twitter_engagement_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM task_submissions
      WHERE task_submissions.id = twitter_engagement_submissions.submission_id
        AND task_submissions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and council can read all twitter engagement submissions" ON twitter_engagement_submissions;
CREATE POLICY "Admins and council can read all twitter engagement submissions"
  ON twitter_engagement_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'council')
    )
  );

REVOKE ALL ON TABLE twitter_accounts FROM anon;
REVOKE ALL ON TABLE twitter_oauth_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE twitter_engagement_tasks FROM anon;
REVOKE ALL ON TABLE twitter_engagement_submissions FROM anon;
GRANT SELECT ON TABLE twitter_accounts TO authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON twitter_accounts FROM authenticated;

DROP TRIGGER IF EXISTS set_twitter_accounts_updated_at ON twitter_accounts;
CREATE TRIGGER set_twitter_accounts_updated_at
  BEFORE UPDATE ON twitter_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_twitter_engagement_tasks_updated_at ON twitter_engagement_tasks;
CREATE TRIGGER set_twitter_engagement_tasks_updated_at
  BEFORE UPDATE ON twitter_engagement_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_twitter_engagement_submissions_updated_at ON twitter_engagement_submissions;
CREATE TRIGGER set_twitter_engagement_submissions_updated_at
  BEFORE UPDATE ON twitter_engagement_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
