-- ===========================================================================
-- Migration: Dispute evidence file storage support
-- Purpose: Add file evidence support for disputes with private storage
-- ===========================================================================

-- The `disputes` table is created in 20260216100000_dispute_resolution.sql
-- (later timestamp). The ALTER TABLE + constraint are deferred to migration
-- 20260216100002 and guarded here so fresh Supabase instances can apply this
-- migration without error.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'disputes'
  ) THEN
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS evidence_files TEXT[] NOT NULL DEFAULT '{}';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'disputes_evidence_files_max'
    ) THEN
      ALTER TABLE disputes
        ADD CONSTRAINT disputes_evidence_files_max
        CHECK (COALESCE(array_length(evidence_files, 1), 0) <= 5);
    END IF;
  END IF;
END $$;

-- Private bucket for dispute evidence attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-evidence', 'dispute-evidence', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Users can manage only files in their own folder: <user_id>/<filename>
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can view their dispute evidence'
  ) THEN
    CREATE POLICY "Users can view their dispute evidence"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'dispute-evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload their dispute evidence'
  ) THEN
    CREATE POLICY "Users can upload their dispute evidence"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'dispute-evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update their dispute evidence'
  ) THEN
    CREATE POLICY "Users can update their dispute evidence"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'dispute-evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete their dispute evidence'
  ) THEN
    CREATE POLICY "Users can delete their dispute evidence"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'dispute-evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
