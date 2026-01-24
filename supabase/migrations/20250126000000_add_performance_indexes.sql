-- Voting queries
CREATE INDEX IF NOT EXISTS idx_votes_proposal_voter ON votes(proposal_id, voter_id);
CREATE INDEX IF NOT EXISTS idx_holder_snapshots_proposal_wallet ON holder_snapshots(
  proposal_id,
  wallet_pubkey
);

-- Task queries
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_review
  ON task_submissions(task_id, review_status);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_user ON task_assignees(task_id, user_id);
