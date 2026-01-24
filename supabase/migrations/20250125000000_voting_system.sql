-- Voting System Migration
-- Adds token-weighted voting with quorum checking and anti-abuse measures

-- Add voting-related columns to proposals table
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS voting_starts_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voting_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS snapshot_taken_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_circulating_supply NUMERIC,
ADD COLUMN IF NOT EXISTS quorum_required NUMERIC,
ADD COLUMN IF NOT EXISTS approval_threshold NUMERIC DEFAULT 50.0,
ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('passed', 'failed', 'quorum_not_met'));

-- Create voting configuration table
CREATE TABLE IF NOT EXISTS voting_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    quorum_percentage NUMERIC NOT NULL DEFAULT 5.0,
    approval_threshold NUMERIC NOT NULL DEFAULT 50.0,
    voting_duration_days INTEGER NOT NULL DEFAULT 5,
    proposal_threshold_org NUMERIC NOT NULL DEFAULT 0,
    proposer_cooldown_days INTEGER NOT NULL DEFAULT 7,
    max_live_proposals INTEGER NOT NULL DEFAULT 1,
    abstain_counts_toward_quorum BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id)
);

-- Add index for faster voting queries
CREATE INDEX IF NOT EXISTS idx_proposals_voting_status ON proposals(status) WHERE status = 'voting';
CREATE INDEX IF NOT EXISTS idx_proposals_voting_ends_at ON proposals(voting_ends_at) WHERE voting_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_proposal_value ON votes(proposal_id, value);

-- Add trigger for updated_at on voting_config
CREATE TRIGGER update_voting_config_updated_at BEFORE UPDATE ON voting_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on voting_config
ALTER TABLE voting_config ENABLE ROW LEVEL SECURITY;

-- Voting config policies
CREATE POLICY "Voting config is viewable by everyone"
    ON voting_config FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage voting config"
    ON voting_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add policy for members to update their own votes
CREATE POLICY "Members can update their own votes"
    ON votes FOR UPDATE
    USING (
        auth.uid() = voter_id AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('member', 'council', 'admin')
        )
    );

-- Insert default voting config (no org_id for single-tenant setup)
INSERT INTO voting_config (
    quorum_percentage,
    approval_threshold,
    voting_duration_days,
    proposal_threshold_org,
    proposer_cooldown_days,
    max_live_proposals,
    abstain_counts_toward_quorum
) VALUES (
    5.0,    -- 5% quorum
    50.0,   -- 50% approval threshold
    5,      -- 5 days voting period
    0,      -- No minimum tokens to create proposal
    7,      -- 7 days cooldown between proposals
    1,      -- 1 live proposal per user
    true    -- Abstain counts toward quorum
) ON CONFLICT DO NOTHING;

-- Function to check if user can vote based on snapshot
CREATE OR REPLACE FUNCTION get_user_voting_weight(
    p_proposal_id UUID,
    p_wallet_pubkey TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_weight NUMERIC;
BEGIN
    SELECT balance_ui INTO v_weight
    FROM holder_snapshots
    WHERE proposal_id = p_proposal_id
    AND wallet_pubkey = p_wallet_pubkey;

    RETURN COALESCE(v_weight, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get vote tallies for a proposal
CREATE OR REPLACE FUNCTION get_vote_tally(p_proposal_id UUID)
RETURNS TABLE (
    yes_votes NUMERIC,
    no_votes NUMERIC,
    abstain_votes NUMERIC,
    total_votes NUMERIC,
    yes_count INTEGER,
    no_count INTEGER,
    abstain_count INTEGER,
    total_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN v.value = 'yes' THEN v.weight ELSE 0 END), 0) as yes_votes,
        COALESCE(SUM(CASE WHEN v.value = 'no' THEN v.weight ELSE 0 END), 0) as no_votes,
        COALESCE(SUM(CASE WHEN v.value = 'abstain' THEN v.weight ELSE 0 END), 0) as abstain_votes,
        COALESCE(SUM(v.weight), 0) as total_votes,
        COUNT(CASE WHEN v.value = 'yes' THEN 1 END)::INTEGER as yes_count,
        COUNT(CASE WHEN v.value = 'no' THEN 1 END)::INTEGER as no_count,
        COUNT(CASE WHEN v.value = 'abstain' THEN 1 END)::INTEGER as abstain_count,
        COUNT(*)::INTEGER as total_count
    FROM votes v
    WHERE v.proposal_id = p_proposal_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if quorum is met for a proposal
CREATE OR REPLACE FUNCTION check_quorum_met(
    p_proposal_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_total_supply NUMERIC;
    v_quorum_required NUMERIC;
    v_total_votes NUMERIC;
    v_abstain_votes NUMERIC;
    v_abstain_counts BOOLEAN;
BEGIN
    -- Get proposal voting parameters
    SELECT total_circulating_supply, quorum_required
    INTO v_total_supply, v_quorum_required
    FROM proposals
    WHERE id = p_proposal_id;

    IF v_total_supply IS NULL OR v_total_supply = 0 THEN
        RETURN false;
    END IF;

    -- Get voting config
    SELECT abstain_counts_toward_quorum INTO v_abstain_counts
    FROM voting_config
    LIMIT 1;

    -- Get vote tallies
    SELECT
        SUM(weight),
        SUM(CASE WHEN value = 'abstain' THEN weight ELSE 0 END)
    INTO v_total_votes, v_abstain_votes
    FROM votes
    WHERE proposal_id = p_proposal_id;

    v_total_votes := COALESCE(v_total_votes, 0);
    v_abstain_votes := COALESCE(v_abstain_votes, 0);

    -- If abstain doesn't count, subtract from total
    IF NOT COALESCE(v_abstain_counts, true) THEN
        v_total_votes := v_total_votes - v_abstain_votes;
    END IF;

    -- Check if quorum is met (total votes >= quorum_required)
    RETURN v_total_votes >= v_quorum_required;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate vote result
CREATE OR REPLACE FUNCTION calculate_vote_result(
    p_proposal_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_quorum_met BOOLEAN;
    v_yes_votes NUMERIC;
    v_no_votes NUMERIC;
    v_approval_threshold NUMERIC;
    v_yes_percentage NUMERIC;
BEGIN
    -- Check quorum first
    v_quorum_met := check_quorum_met(p_proposal_id);

    IF NOT v_quorum_met THEN
        RETURN 'quorum_not_met';
    END IF;

    -- Get vote counts
    SELECT
        SUM(CASE WHEN value = 'yes' THEN weight ELSE 0 END),
        SUM(CASE WHEN value = 'no' THEN weight ELSE 0 END)
    INTO v_yes_votes, v_no_votes
    FROM votes
    WHERE proposal_id = p_proposal_id;

    v_yes_votes := COALESCE(v_yes_votes, 0);
    v_no_votes := COALESCE(v_no_votes, 0);

    -- Get approval threshold
    SELECT approval_threshold INTO v_approval_threshold
    FROM proposals
    WHERE id = p_proposal_id;

    v_approval_threshold := COALESCE(v_approval_threshold, 50.0);

    -- Calculate yes percentage (of yes + no votes only)
    IF (v_yes_votes + v_no_votes) > 0 THEN
        v_yes_percentage := (v_yes_votes / (v_yes_votes + v_no_votes)) * 100;
    ELSE
        v_yes_percentage := 0;
    END IF;

    -- Check if passed
    IF v_yes_percentage >= v_approval_threshold THEN
        RETURN 'passed';
    ELSE
        RETURN 'failed';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comment explaining the voting system
COMMENT ON TABLE voting_config IS 'Global voting configuration for the DAO. One row per org (or single row for single-tenant).';
COMMENT ON COLUMN proposals.voting_starts_at IS 'When voting opens for this proposal';
COMMENT ON COLUMN proposals.voting_ends_at IS 'When voting closes for this proposal';
COMMENT ON COLUMN proposals.snapshot_taken_at IS 'When the token holder snapshot was captured';
COMMENT ON COLUMN proposals.total_circulating_supply IS 'Total token supply at snapshot time';
COMMENT ON COLUMN proposals.quorum_required IS 'Minimum tokens that must vote for quorum';
COMMENT ON COLUMN proposals.approval_threshold IS 'Percentage of yes votes (vs yes+no) needed to pass';
COMMENT ON COLUMN proposals.result IS 'Final result: passed, failed, or quorum_not_met';
