-- Add missing foreign key indexes for query performance.
-- Postgres does NOT auto-index FK columns; without these,
-- JOINs and CASCADE operations trigger sequential scans.

-- task_submissions: reviewer lookups
create index if not exists idx_task_submissions_reviewer_id
  on task_submissions (reviewer_id);

-- comments: org-scoped queries
create index if not exists idx_comments_org_id
  on comments (org_id);

-- notifications: actor join enrichment
create index if not exists idx_notifications_actor_id
  on notifications (actor_id);

-- votes: org-scoped voting
create index if not exists idx_votes_org_id
  on votes (org_id);

-- user_achievements: achievement def lookups
create index if not exists idx_user_achievements_achievement_id
  on user_achievements (achievement_id);

-- reward_claims: admin review filtering
create index if not exists idx_reward_claims_reviewed_by
  on reward_claims (reviewed_by);

-- reward_distributions: claim and creator lookups
create index if not exists idx_reward_distributions_claim_id
  on reward_distributions (claim_id);

create index if not exists idx_reward_distributions_created_by
  on reward_distributions (created_by);

-- dispute_comments: user comment filtering
create index if not exists idx_dispute_comments_user_id
  on dispute_comments (user_id);

-- idea_votes: user vote filtering
create index if not exists idx_idea_votes_user_id
  on idea_votes (user_id);

-- idea_events: actor filtering
create index if not exists idx_idea_events_actor_id
  on idea_events (actor_id);

-- ideas: org scoping and proposal linkage
create index if not exists idx_ideas_org_id
  on ideas (org_id);

create index if not exists idx_ideas_promoted_to_proposal_id
  on ideas (promoted_to_proposal_id);

-- post_flags: user flag filtering
create index if not exists idx_post_flags_user_id
  on post_flags (user_id);

-- referral_codes: user code lookup
create index if not exists idx_referral_codes_user_id
  on referral_codes (user_id);

-- holder_snapshots: composite index for wallet balance lookups
-- (wallet_pubkey + taken_at DESC) used by proposal creation
create index if not exists idx_holder_snapshots_wallet_taken
  on holder_snapshots (wallet_pubkey, taken_at desc);
