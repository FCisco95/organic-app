import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Testimonials RLS Audit Tests
 *
 * The testimonials feature stores user-submitted feedback that is shown
 * publicly once approved. Required RLS guarantees (from the dashboard
 * revamp plan):
 *
 *   1. Anyone (anon + authenticated) can SELECT testimonials WHERE status='approved'
 *   2. Authenticated members can SELECT only their own pending/rejected rows
 *   3. Authenticated members can INSERT only with member_id = auth.uid()
 *      AND status = 'pending'
 *   4. UPDATE / DELETE belongs to the service role (admin moderation),
 *      bypassing RLS — no explicit user-facing policy
 *   5. RLS is enabled on the table
 */

const MIGRATION_PATH = resolve(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260428000000_dashboard_schema.sql'
);

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8');
}

describe('Testimonials table — RLS policy audit', () => {
  it('enables RLS on the testimonials table', () => {
    const sql = readMigration();
    expect(sql).toMatch(/ALTER TABLE\s+testimonials\s+ENABLE ROW LEVEL SECURITY/i);
  });

  it('allows anyone to read approved testimonials', () => {
    const sql = readMigration();
    expect(sql).toMatch(/CREATE POLICY[^;]*FOR SELECT[\s\S]*USING\s*\(\s*status\s*=\s*'approved'\s*\)/i);
  });

  it('only authenticated users can read their own non-approved testimonials', () => {
    const sql = readMigration();
    expect(sql).toMatch(/CREATE POLICY[^;]*FOR SELECT[\s\S]*TO\s+authenticated[\s\S]*USING\s*\(\s*member_id\s*=\s*auth\.uid\(\)\s*\)/i);
  });

  it('authenticated INSERT must scope member_id to auth.uid() and status=pending', () => {
    const sql = readMigration();
    // Must require member_id = auth.uid()
    expect(sql).toMatch(/CREATE POLICY[^;]*FOR INSERT[\s\S]*TO\s+authenticated[\s\S]*member_id\s*=\s*auth\.uid\(\)/i);
    // Must require status = 'pending'
    expect(sql).toMatch(/CREATE POLICY[^;]*FOR INSERT[\s\S]*status\s*=\s*'pending'/i);
  });

  it('does NOT grant UPDATE or DELETE policies to public/authenticated roles', () => {
    const sql = readMigration();
    // No policy targeting authenticated for UPDATE/DELETE on testimonials
    const updateMatch = sql.match(/CREATE POLICY[^;]*ON\s+testimonials[\s\S]*?FOR UPDATE[\s\S]*?(TO\s+(public|authenticated))/i);
    const deleteMatch = sql.match(/CREATE POLICY[^;]*ON\s+testimonials[\s\S]*?FOR DELETE[\s\S]*?(TO\s+(public|authenticated))/i);
    expect(updateMatch).toBeNull();
    expect(deleteMatch).toBeNull();
  });

  it('rating column has check constraint 1..5', () => {
    const sql = readMigration();
    expect(sql).toMatch(/rating\s+SMALLINT\s+NOT NULL\s+CHECK\s*\(\s*rating\s+BETWEEN\s+1\s+AND\s+5\s*\)/i);
  });

  it('quote column has length check (10..500)', () => {
    const sql = readMigration();
    expect(sql).toMatch(/quote\s+TEXT\s+NOT NULL\s+CHECK\s*\(\s*char_length\(quote\)\s+BETWEEN\s+10\s+AND\s+500\s*\)/i);
  });

  it('status column has CHECK constraint for known values only', () => {
    const sql = readMigration();
    expect(sql).toMatch(/status\s+TEXT\s+NOT NULL\s+DEFAULT\s+'pending'[\s\S]*CHECK\s*\(\s*status\s+IN\s*\(\s*'pending'\s*,\s*'approved'\s*,\s*'rejected'\s*\)\s*\)/i);
  });
});
