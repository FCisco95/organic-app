-- Wallet nonces table for replay attack prevention
-- Nonces are single-use and expire after 5 minutes

create extension if not exists "pgcrypto";


CREATE TABLE wallet_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nonce TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup and cleanup
CREATE INDEX idx_wallet_nonces_nonce ON wallet_nonces(nonce);
CREATE INDEX idx_wallet_nonces_expires_at ON wallet_nonces(expires_at);

-- Enable RLS
ALTER TABLE wallet_nonces ENABLE ROW LEVEL SECURITY;

-- Only the server (service role) should interact with this table
-- Users should not be able to read/write nonces directly
CREATE POLICY "Service role only"
    ON wallet_nonces FOR ALL
    USING (false)
    WITH CHECK (false);

-- Function to clean up expired nonces (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM wallet_nonces
    WHERE expires_at < NOW() OR used_at IS NOT NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
