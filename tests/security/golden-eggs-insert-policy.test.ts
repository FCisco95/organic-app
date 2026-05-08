import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * HIGH-3 regression test (Security audit 2026-05-08).
 *
 * golden_eggs originally had:
 *   CREATE POLICY "golden_eggs_insert_authenticated"
 *     ON public.golden_eggs FOR INSERT TO authenticated
 *     WITH CHECK (user_id = auth.uid());
 *
 * That lets ANY authenticated user write rows to golden_eggs as long as
 * user_id = themselves — bypassing the actual game discovery mechanism.
 * All legitimate egg writes go through service_role (egg-claim,
 * egg-check), so the user-level policy is unsafe and unnecessary. The
 * Easter 2026 campaign is archived (PR #106) but the table and policy
 * still exist. This guards against the policy reactivating in any
 * future migration without an explicit DROP.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

function listSqlFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((n) => n.endsWith('.sql'))
    .sort();
}

function readMigrations(): Array<{ name: string; sql: string }> {
  return listSqlFiles().map((name) => ({
    name,
    sql: readFileSync(path.join(MIGRATIONS_DIR, name), 'utf-8'),
  }));
}

describe('golden_eggs INSERT policy is not active (HIGH-3)', () => {
  it('the insert policy is dropped after its initial CREATE', () => {
    const migrations = readMigrations();
    let createIdx = -1;
    let dropIdx = -1;
    for (let i = 0; i < migrations.length; i++) {
      const sql = migrations[i].sql;
      if (
        createIdx === -1 &&
        /CREATE\s+POLICY\s+"?golden_eggs_insert_authenticated"?\s+ON\s+public\.golden_eggs/i.test(sql)
      ) {
        createIdx = i;
      }
      if (
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?golden_eggs_insert_authenticated"?\s+ON\s+public\.golden_eggs/i.test(sql)
      ) {
        dropIdx = i;
      }
    }

    expect(createIdx, 'expected golden_eggs_insert_authenticated CREATE in history').toBeGreaterThanOrEqual(0);
    expect(
      dropIdx,
      'no migration drops golden_eggs_insert_authenticated — auth users can self-insert eggs',
    ).toBeGreaterThanOrEqual(0);
    expect(
      dropIdx,
      'DROP must come after the CREATE in migration order',
    ).toBeGreaterThan(createIdx);
  });
});
