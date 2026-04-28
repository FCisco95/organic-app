-- Add 'testimonial_approved' to the activity_event_type enum so that the
-- existing notifications + activity_log infrastructure can carry approval
-- events for the testimonials feature.
--
-- ALTER TYPE ... ADD VALUE is supported in Postgres 12+ and is safe to run
-- inside a transactional migration block (Supabase wraps each .sql file
-- in a single transaction).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'public.activity_event_type'::regtype
      AND enumlabel = 'testimonial_approved'
  ) THEN
    ALTER TYPE public.activity_event_type ADD VALUE 'testimonial_approved';
  END IF;
END$$;

-- Rollback notes:
-- Postgres does not support DROP VALUE. To remove this value the only path is
-- to recreate the enum (out of scope for this incremental migration).
