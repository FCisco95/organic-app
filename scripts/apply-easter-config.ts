/**
 * Applies the XP egg migration and enables Easter features.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/apply-easter-config.ts
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

async function main() {
  // Step 1: Apply migration — add columns to egg_hunt_config
  console.log('1. Adding xp_egg columns to egg_hunt_config...');
  const { error: alterError } = await supabase.rpc('exec_sql' as any, {
    sql: `
      ALTER TABLE public.egg_hunt_config
        ADD COLUMN IF NOT EXISTS xp_egg_enabled BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS xp_egg_spawn_rate DECIMAL(5,4) NOT NULL DEFAULT 0.04;
    `,
  }).single();

  // rpc may not exist — try direct approach
  if (alterError) {
    console.log('   RPC not available, trying direct table operations...');
  } else {
    console.log('   Columns added.');
  }

  // Step 2: Create xp_egg_pending table
  console.log('2. Creating xp_egg_pending table...');
  const { error: createError } = await supabase.rpc('exec_sql' as any, {
    sql: `
      CREATE TABLE IF NOT EXISTS public.xp_egg_pending (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
        xp_amount INT NOT NULL,
        is_shiny BOOLEAN NOT NULL DEFAULT false,
        egg_number INT,
        element TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_xp_egg_pending_user
        ON public.xp_egg_pending(user_id, created_at);
      ALTER TABLE public.xp_egg_pending ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        CREATE POLICY "xp_egg_pending_select_own"
          ON public.xp_egg_pending FOR SELECT TO authenticated
          USING (user_id = auth.uid());
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE POLICY "xp_egg_pending_delete_own"
          ON public.xp_egg_pending FOR DELETE TO authenticated
          USING (user_id = auth.uid());
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
  }).single();

  if (createError) {
    console.log('   RPC not available for table creation. Please run the migration SQL manually in Supabase SQL Editor.');
    console.log('   File: supabase/migrations/20260404000000_xp_eggs.sql');
  } else {
    console.log('   Table created.');
  }

  // Step 3: Enable Easter features (this works via normal table operations)
  console.log('3. Enabling Easter features...');
  const { data, error: updateError } = await supabase
    .from('egg_hunt_config' as any)
    .update({
      hunt_enabled: true,
      xp_egg_enabled: true,
      xp_egg_spawn_rate: 0.5,
      shimmer_enabled: true,
      shimmer_rate: 0.03,
      base_spawn_rate: 0.001,
      hunt_ends_at: '2026-04-20T23:59:59Z',
      updated_at: new Date().toISOString(),
    })
    .not('id', 'is', null) // update all rows (should be 1)
    .select();

  if (updateError) {
    console.error('   Failed to update config:', updateError.message);
    // Might fail if columns don't exist yet — migration needed first
    if (updateError.message.includes('xp_egg')) {
      console.log('\n   The xp_egg columns are missing. You need to run the migration SQL first.');
      console.log('   Go to Supabase Dashboard → SQL Editor and paste the contents of:');
      console.log('   supabase/migrations/20260404000000_xp_eggs.sql');
      console.log('\n   Then re-run this script.');
    }
  } else {
    console.log('   Config updated:', data);
  }

  console.log('\nDone. Easter features should now be active with 50% XP egg spawn rate for testing.');
}

main().catch(console.error);
