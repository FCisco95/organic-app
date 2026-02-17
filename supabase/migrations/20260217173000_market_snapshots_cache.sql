-- Durable snapshot cache for external market prices (Jupiter/CoinGecko).
-- Used by /api/stats, /api/analytics, /api/treasury to reduce upstream 429 risk.

CREATE TABLE IF NOT EXISTS public.market_snapshots (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider TEXT NOT NULL DEFAULT 'none',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stale_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_expires_at
  ON public.market_snapshots (expires_at);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_stale_until
  ON public.market_snapshots (stale_until);

CREATE OR REPLACE FUNCTION public.touch_market_snapshots_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_market_snapshots_updated_at ON public.market_snapshots;
CREATE TRIGGER trg_market_snapshots_updated_at
BEFORE UPDATE ON public.market_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.touch_market_snapshots_updated_at();

CREATE OR REPLACE FUNCTION public.cleanup_market_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.market_snapshots
  WHERE stale_until < (NOW() - INTERVAL '7 days');
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $do$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'market-snapshots-cleanup'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'market-snapshots-cleanup',
    '*/30 * * * *',
    $job$SELECT public.cleanup_market_snapshots();$job$
  );
END
$do$;
