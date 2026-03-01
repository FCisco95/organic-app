import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase env vars required for audit export.');
  process.exit(1);
}

const sinceIso =
  process.env.OP_CONTROLS_SINCE ?? new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const outputPath = process.env.OP_CONTROLS_AUDIT_OUT ?? 'test-results/operational-controls-audit.json';
const outputAbsPath = resolve(process.cwd(), outputPath);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: rewardRows, error: rewardError } = await supabase
  .from('reward_settlement_events')
  .select('sprint_id, event_type, reason, idempotency_key, metadata, created_by, created_at')
  .in('event_type', ['integrity_hold', 'kill_switch'])
  .gte('created_at', sinceIso)
  .order('created_at', { ascending: false })
  .limit(50);

if (rewardError) {
  console.error('Failed to query reward_settlement_events:', rewardError);
  process.exit(1);
}

const { data: proposalRows, error: proposalError } = await supabase
  .from('proposal_stage_events')
  .select('proposal_id, reason, from_status, to_status, actor_id, metadata, created_at')
  .in('reason', ['finalization_kill_switch', 'finalization_manual_resume'])
  .gte('created_at', sinceIso)
  .order('created_at', { ascending: false })
  .limit(50);

if (proposalError) {
  console.error('Failed to query proposal_stage_events:', proposalError);
  process.exit(1);
}

const snapshot = {
  generated_at: new Date().toISOString(),
  since: sinceIso,
  summary: {
    reward_event_count: rewardRows?.length ?? 0,
    proposal_event_count: proposalRows?.length ?? 0,
  },
  reward_settlement_events: rewardRows ?? [],
  proposal_stage_events: proposalRows ?? [],
};

mkdirSync(dirname(outputAbsPath), { recursive: true });
writeFileSync(outputAbsPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

console.log(`Operational controls audit snapshot written to ${outputAbsPath}`);
console.log(
  JSON.stringify(
    {
      summary: snapshot.summary,
      since: snapshot.since,
    },
    null,
    2
  )
);
