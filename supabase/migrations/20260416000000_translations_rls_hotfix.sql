-- Security hotfix: restrict content_translations INSERT/DELETE to service_role.
--
-- The initial migration (20260413000000_content_translations.sql) used
-- WITH CHECK (true) / USING (true) on the INSERT and DELETE policies, which
-- effectively allowed any authenticated user to insert or delete cached
-- translations. SELECT remains public read (translations are derived from
-- public content).
--
-- After this migration, only the service role (used exclusively by the
-- translate API routes on the server) can mutate the cache.

DROP POLICY IF EXISTS "Service role can insert translations" ON content_translations;
DROP POLICY IF EXISTS "Service role can delete translations" ON content_translations;

CREATE POLICY "Service role can insert translations"
  ON content_translations FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete translations"
  ON content_translations FOR DELETE
  USING (auth.role() = 'service_role');
