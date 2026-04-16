// scripts/backfill-detected-language.ts
//
// One-time script to detect language on existing translatable content rows.
// Run: npx tsx scripts/backfill-detected-language.ts
//
// Safe to re-run — only updates rows where detected_language IS NULL.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { detectLanguage } from '../src/lib/translation/detect-language';

config({ path: process.env.ENV_FILE ?? '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BackfillTarget {
  table: string;
  selectColumns: string;
  textFromRow: (row: Record<string, unknown>) => string;
}

const TARGETS: BackfillTarget[] = [
  {
    table: 'posts',
    selectColumns: 'id, title, body',
    textFromRow: (row) => `${row.title ?? ''} ${row.body ?? ''}`,
  },
  {
    table: 'proposals',
    selectColumns: 'id, body',
    textFromRow: (row) => String(row.body ?? ''),
  },
  {
    table: 'ideas',
    selectColumns: 'id, body',
    textFromRow: (row) => String(row.body ?? ''),
  },
  {
    table: 'comments',
    selectColumns: 'id, body',
    textFromRow: (row) => String(row.body ?? ''),
  },
  {
    table: 'task_comments',
    selectColumns: 'id, content',
    textFromRow: (row) => String(row.content ?? ''),
  },
];

async function backfillTable(target: BackfillTarget) {
  console.log(`\n── ${target.table} ─────────────────────────`);

  const { data: rows, error } = await supabase
    .from(target.table)
    .select(target.selectColumns)
    .is('detected_language', null);

  if (error) {
    console.error(`Failed to fetch ${target.table}:`, error.message);
    return;
  }

  const list = (rows ?? []) as unknown as Array<Record<string, unknown> & { id: string }>;
  console.log(`Found ${list.length} rows without detected_language`);

  let updated = 0;
  for (const row of list) {
    const lang = detectLanguage(target.textFromRow(row));
    if (!lang) continue;

    const { error: updateError } = await supabase
      .from(target.table)
      .update({ detected_language: lang })
      .eq('id', row.id);

    if (updateError) {
      console.error(`Failed to update ${target.table} ${row.id}:`, updateError.message);
    } else {
      updated++;
    }
  }

  console.log(`Backfilled ${updated}/${list.length} ${target.table} rows`);
}

async function backfill() {
  for (const target of TARGETS) {
    await backfillTable(target);
  }
}

backfill().catch(console.error);
