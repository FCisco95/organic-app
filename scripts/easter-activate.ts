/**
 * Easter campaign production activation script.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/easter-activate.ts --phase shimmer
 *   npx tsx scripts/easter-activate.ts --phase launch
 *   npx tsx scripts/easter-activate.ts --phase reveal
 *   npx tsx scripts/easter-activate.ts --phase status
 *   npx tsx scripts/easter-activate.ts --clear
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Phase configs
// ---------------------------------------------------------------------------

const PHASE_CONFIGS: Record<string, Record<string, unknown>> = {
  shimmer: {
    shimmer_enabled: true,
    shimmer_rate: 0.03,
    hunt_enabled: false,
    xp_egg_enabled: false,
    campaign_revealed: false,
  },
  launch: {
    hunt_enabled: true,
    base_spawn_rate: 0.001,
    xp_egg_enabled: true,
    xp_egg_spawn_rate: 0.04,
    shimmer_enabled: true,
    shimmer_rate: 0.03,
    hunt_ends_at: '2026-04-20T23:59:59Z',
    campaign_revealed: false,
  },
  reveal: {
    campaign_revealed: true,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(): { phase: string; clear: boolean } {
  const args = process.argv.slice(2);

  if (args.includes('--clear')) {
    return { phase: '', clear: true };
  }

  const eqFlag = args.find((a) => a.startsWith('--phase='));
  if (eqFlag) {
    return { phase: eqFlag.split('=')[1], clear: false };
  }

  const idx = args.indexOf('--phase');
  if (idx !== -1 && args[idx + 1]) {
    return { phase: args[idx + 1], clear: false };
  }

  return { phase: 'status', clear: false };
}

async function printCurrentConfig(): Promise<void> {
  const { data, error } = await supabase
    .from('egg_hunt_config')
    .select('*')
    .single();

  if (error) {
    console.error('Failed to read config:', error.message);
    return;
  }

  console.log('\nCurrent egg_hunt_config:');
  console.log(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Phase activation
// ---------------------------------------------------------------------------

async function activatePhase(phase: string): Promise<void> {
  if (phase === 'status') {
    await printCurrentConfig();
    return;
  }

  const config = PHASE_CONFIGS[phase];
  if (!config) {
    console.error(
      `Unknown phase "${phase}". Valid phases: ${Object.keys(PHASE_CONFIGS).join(', ')}, status`
    );
    process.exit(1);
  }

  console.log(`Activating phase: ${phase}`);

  const { error } = await supabase
    .from('egg_hunt_config')
    .update(config)
    .not('id', 'is', null);

  if (error) {
    console.error('Failed to update config:', error.message);
    process.exit(1);
  }

  console.log(`Phase "${phase}" activated.`);
  await printCurrentConfig();
}

// ---------------------------------------------------------------------------
// Clear test data
// ---------------------------------------------------------------------------

async function clearTestData(): Promise<void> {
  console.log('Clearing Easter test data...\n');

  const tables: Array<{ name: string; filter?: { column: string; op: string; value: unknown } }> = [
    { name: 'golden_eggs' },
    { name: 'xp_egg_pending' },
    { name: 'egg_hunt_luck' },
    {
      name: 'xp_events',
      filter: { column: 'event_type', op: 'in', value: '("egg_found","xp_egg_found")' },
    },
  ];

  for (const table of tables) {
    let query = supabase.from(table.name).delete().not('id', 'is', null);

    if (table.filter) {
      // Use .or for the in-list filter on xp_events
      query = supabase
        .from(table.name)
        .delete()
        .in('event_type', ['egg_found', 'xp_egg_found']);
    }

    const { data, error } = await query.select('id');

    if (error) {
      console.error(`  ${table.name}: ERROR — ${error.message}`);
    } else {
      const count = data?.length ?? 0;
      console.log(`  ${table.name}: deleted ${count} row(s)`);
    }
  }

  console.log('\nDone.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { phase, clear } = parseArgs();

  if (clear) {
    await clearTestData();
    return;
  }

  await activatePhase(phase);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
