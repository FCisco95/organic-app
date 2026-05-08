import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * CRIT-1 regression test (Security audit 2026-05-08).
 *
 * The leaderboard view is publicly readable (SELECT granted to anon) so it
 * MUST NOT contain PII or internal economic data. Two earlier migrations
 * accidentally re-added `email` and `claimable_points` to the view after
 * an earlier hardening migration removed them. This test guards against
 * that regression.
 *
 * It scans every migration file that creates `leaderboard_view` and asserts
 * the column list does not contain `email` or `claimable_points` in the
 * MOST RECENT one — which is the shape that ends up in the running DB
 * (Supabase orders migrations by filename, see feedback memory).
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function getLatestLeaderboardViewMigration(): { name: string; sql: string } | null {
  const files = listMigrations();
  for (let i = files.length - 1; i >= 0; i--) {
    const name = files[i];
    const sql = readFileSync(path.join(MIGRATIONS_DIR, name), 'utf-8');
    // Match a CREATE [OR REPLACE] VIEW … leaderboard_view statement.
    if (/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?leaderboard_view\b/i.test(sql)) {
      return { name, sql };
    }
  }
  return null;
}

function extractLeaderboardViewBody(sql: string): string {
  const match = sql.match(
    /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?leaderboard_view\b[\s\S]*?;/i
  );
  return match ? match[0] : '';
}

describe('Leaderboard view PII exposure (CRIT-1)', () => {
  it('latest leaderboard_view migration must not select email column', () => {
    const latest = getLatestLeaderboardViewMigration();
    expect(latest, 'no migration creates leaderboard_view').not.toBeNull();
    const body = extractLeaderboardViewBody(latest!.sql);
    // Match `email` as a SELECTed column (word boundary, optionally followed by
    // comma / whitespace / newline). Avoid matching the word inside a comment.
    const codeOnly = body
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n');
    expect(
      codeOnly,
      `${latest!.name} must not expose email in the publicly-readable leaderboard_view`
    ).not.toMatch(/\bemail\b\s*,/);
  });

  it('latest leaderboard_view migration must not select claimable_points column', () => {
    const latest = getLatestLeaderboardViewMigration();
    expect(latest).not.toBeNull();
    const body = extractLeaderboardViewBody(latest!.sql);
    const codeOnly = body
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n');
    expect(
      codeOnly,
      `${latest!.name} must not expose claimable_points in the publicly-readable leaderboard_view`
    ).not.toMatch(/\bclaimable_points\b/);
  });
});
