-- Creates the dispute_activity_counters trigger that was deferred from
-- migration 20260215233000 (which ran before the `disputes` table existed).
-- This migration is idempotent on prod (trigger may already exist from
-- an out-of-band path) and required on fresh DBs.

DROP TRIGGER IF EXISTS trigger_dispute_activity_counters ON disputes;
CREATE TRIGGER trigger_dispute_activity_counters
  AFTER INSERT OR UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_dispute_activity_counters();
