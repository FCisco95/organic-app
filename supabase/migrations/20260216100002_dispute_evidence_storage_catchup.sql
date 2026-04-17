-- Applies the ALTER TABLE + constraint that migration 20260216003000
-- deferred (it ran before the `disputes` table existed).
-- Idempotent: ADD COLUMN IF NOT EXISTS + conname guard.

ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS evidence_files TEXT[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'disputes_evidence_files_max'
  ) THEN
    ALTER TABLE disputes
      ADD CONSTRAINT disputes_evidence_files_max
      CHECK (COALESCE(array_length(evidence_files, 1), 0) <= 5);
  END IF;
END $$;
