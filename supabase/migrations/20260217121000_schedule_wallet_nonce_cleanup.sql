-- Keep wallet_nonces compact by periodically removing expired/used rows.
create extension if not exists pg_cron;

do $$
declare
  existing_job_id integer;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'cleanup-expired-wallet-nonces'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'cleanup-expired-wallet-nonces',
    '*/15 * * * *',
    $cleanup$select public.cleanup_expired_nonces();$cleanup$
  );
end;
$$;
