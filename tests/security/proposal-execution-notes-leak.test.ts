import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Regression test for the 2026-05-16 RLS USING(true) audit
 * (docs/audits/2026-05-16-rls-using-true-audit.md).
 *
 * proposals.execution_notes was world-readable via the
 * 20250101000000_initial_schema.sql "Proposals are viewable by everyone"
 * USING(true) policy. The 20260516000000_proposal_execution_events.sql
 * migration:
 *   1. created an admin-only proposal_execution_events table to hold
 *      execution context going forward,
 *   2. revoked anon column-level SELECT on proposals.execution_notes, and
 *   3. routed the executor (src/app/api/proposals/[id]/execute/route.ts)
 *      to write to the new table instead of the deprecated column.
 *
 * The follow-up 20260517000000_drop_proposal_execution_notes.sql migration
 * then dropped the column entirely (with a defensive rescue-backfill for
 * any value not already represented in proposal_execution_events).
 *
 * This test guards against regressions on all four legs.
 */

const REPO_ROOT = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase/migrations');
const EXECUTE_ROUTE = path.join(REPO_ROOT, 'src/app/api/proposals/[id]/execute/route.ts');

function readMigration(name: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, name), 'utf-8');
}

function migrationExists(prefix: string): string | null {
  return readdirSync(MIGRATIONS_DIR).find((f) => f.startsWith(prefix)) ?? null;
}

describe('proposal execution notes anon leak (2026-05-16 audit)', () => {
  it('the proposal_execution_events migration exists', () => {
    const name = migrationExists('20260516000000_proposal_execution_events');
    expect(name, 'expected 20260516000000_proposal_execution_events.sql migration').not.toBeNull();
  });

  it('proposal_execution_events table enables RLS and restricts to admin/council', () => {
    const name = migrationExists('20260516000000_proposal_execution_events');
    expect(name).not.toBeNull();
    const sql = readMigration(name!);

    expect(sql, 'must enable RLS on the new table').toMatch(
      /ALTER\s+TABLE\s+(?:public\.)?proposal_execution_events\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
    expect(sql, 'must create a SELECT policy restricted to admin/council').toMatch(
      /CREATE\s+POLICY[^;]+ON\s+(?:public\.)?proposal_execution_events\s+FOR\s+SELECT[\s\S]+role\s+IN\s*\(\s*'admin'\s*,\s*'council'\s*\)/i
    );
    expect(sql, 'must create an INSERT policy restricted to admin/council').toMatch(
      /CREATE\s+POLICY[^;]+ON\s+(?:public\.)?proposal_execution_events\s+FOR\s+INSERT[\s\S]+role\s+IN\s*\(\s*'admin'\s*,\s*'council'\s*\)/i
    );
  });

  it('migration revokes anon SELECT on proposals and regrants without execution_notes', () => {
    const name = migrationExists('20260516000000_proposal_execution_events');
    expect(name).not.toBeNull();
    const sql = readMigration(name!);

    expect(sql, 'must revoke anon table-level SELECT on proposals').toMatch(
      /REVOKE\s+SELECT\s+ON\s+(?:public\.)?proposals\s+FROM\s+anon/i
    );
    expect(sql, 'must regrant a column-level SELECT to anon on proposals').toMatch(
      /GRANT\s+SELECT\s*\([^)]+\)\s+ON\s+(?:public\.)?proposals\s+TO\s+anon/i
    );
    expect(sql, 'the column-list builder must exclude execution_notes').toMatch(
      /column_name\s*<>\s*'execution_notes'/i
    );
  });

  it('the drop migration exists and removes proposals.execution_notes', () => {
    const name = migrationExists('20260517000000_drop_proposal_execution_notes');
    expect(
      name,
      'expected 20260517000000_drop_proposal_execution_notes.sql migration'
    ).not.toBeNull();

    const sql = readMigration(name!);

    expect(sql, 'must drop the execution_notes column').toMatch(
      /ALTER\s+TABLE\s+(?:public\.)?proposals\s+DROP\s+COLUMN(?:\s+IF\s+EXISTS)?\s+execution_notes/i
    );
    expect(
      sql,
      'must include a defensive rescue-backfill into proposal_execution_events before the drop'
    ).toMatch(/INSERT\s+INTO\s+(?:public\.)?proposal_execution_events[\s\S]+execution_notes/i);
  });

  it('execute route writes to proposal_execution_events and not to execution_notes', () => {
    const source = readFileSync(EXECUTE_ROUTE, 'utf-8');

    expect(
      source,
      'execute route must insert into proposal_execution_events'
    ).toMatch(/\.from\(\s*['"]proposal_execution_events['"]\s*\)\s*\.insert\(/);

    // The deprecated column must not be set anywhere in this route.
    // Strip line comments before checking so docs/comments about the
    // deprecation do not produce false positives.
    const codeOnly = source
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');

    expect(
      codeOnly,
      'execute route must not write the deprecated execution_notes column'
    ).not.toMatch(/execution_notes\s*:/);
  });
});
