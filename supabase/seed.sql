-- seed.sql — applied automatically by `supabase db reset`.
-- Runs AFTER all migrations. Keep idempotent (use ON CONFLICT).
-- Intentionally minimal: migrations seed default orgs + voting_config.
-- Additional fixtures (Solana RPC holders) are added in Phase 4.

-- Solana RPC fixture table — only exists in CI / local dev.
-- Tests write rows here before hitting APIs that read on-chain data.
-- FixtureSolanaRpc (gated by SOLANA_RPC_MODE=fixture) reads from it.
create table if not exists public.solana_rpc_fixtures (
  wallet_address text primary key,
  balance numeric not null check (balance >= 0),
  created_at timestamptz not null default now()
);

-- RLS: service_role only. No public SELECT policy.
alter table public.solana_rpc_fixtures enable row level security;
