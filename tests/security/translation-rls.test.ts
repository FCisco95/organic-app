import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

/**
 * content_translations RLS hardening.
 *
 * Original migration (20260413000000) used `WITH CHECK (true)` / `USING (true)`
 * on INSERT and DELETE policies — any authenticated user could mutate the
 * translation cache. Hotfix migration (20260416000000) restricts mutations to
 * service_role only.
 */
describe('content_translations RLS', () => {
  const hotfix = readFileSync(
    'supabase/migrations/20260416000000_translations_rls_hotfix.sql',
    'utf-8'
  );

  it('drops the permissive insert policy', () => {
    expect(hotfix).toMatch(
      /DROP POLICY IF EXISTS "Service role can insert translations" ON content_translations;/
    );
  });

  it('drops the permissive delete policy', () => {
    expect(hotfix).toMatch(
      /DROP POLICY IF EXISTS "Service role can delete translations" ON content_translations;/
    );
  });

  it('recreates the insert policy with service_role check', () => {
    expect(hotfix).toMatch(
      /CREATE POLICY "Service role can insert translations"\s+ON content_translations FOR INSERT\s+WITH CHECK \(auth\.role\(\) = 'service_role'\);/
    );
  });

  it('recreates the delete policy with service_role check', () => {
    expect(hotfix).toMatch(
      /CREATE POLICY "Service role can delete translations"\s+ON content_translations FOR DELETE\s+USING \(auth\.role\(\) = 'service_role'\);/
    );
  });

  it('preserves public SELECT access (translations are derived from public content)', () => {
    // Public read policy must not be dropped here — translations follow the
    // visibility of their source rows, which are already public.
    expect(hotfix).not.toMatch(/DROP POLICY[^;]*read translations/i);
  });
});
