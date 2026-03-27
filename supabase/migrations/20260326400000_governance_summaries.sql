-- Phase 31: AI Governance Health Summary storage
-- Stores daily AI-generated digests for display on Home + Pulse pages.

create table if not exists governance_summaries (
  id            uuid primary key default gen_random_uuid(),
  content       jsonb not null,          -- structured AI output: headline, keyMetrics, insights, risks, sentiment
  summary_text  text not null,           -- plain-text one-liner for cards
  period_start  timestamptz not null,
  period_end    timestamptz not null,
  model_used    text not null default 'claude-haiku-4-5',
  token_count   int not null default 0,
  created_at    timestamptz not null default now()
);

-- Index for fast "latest summary" lookup
create index idx_governance_summaries_created_at
  on governance_summaries (created_at desc);

-- RLS: anyone can read, only service role can write
alter table governance_summaries enable row level security;

create policy "Anyone can read governance summaries"
  on governance_summaries for select
  using (true);

-- Comment for documentation
comment on table governance_summaries is 'AI-generated daily DAO health digests (Phase 31)';
