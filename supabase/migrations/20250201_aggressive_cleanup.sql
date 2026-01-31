-- Migration: Aggressive Cleanup for Free Tier Endurance
-- Protects Supabase 500MB limit by purging logs every 7 days

-- 1. Create the cleanup function
CREATE OR REPLACE FUNCTION public.aggressive_cleanup()
RETURNS void AS $$
BEGIN
  -- Purge DM logs older than 7 days (saves ~75% space vs 30 days)
  DELETE FROM public.dm_logs 
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Purge PROCESSED webhook batches older than 1 hour (immediate space recovery)
  DELETE FROM public.webhook_batch 
  WHERE processed = true 
  AND processed_at < NOW() - INTERVAL '1 hour';

  -- Purge old rate limit buckets (don't need them after 24h)
  DELETE FROM public.rate_limits 
  WHERE hour_bucket < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 2. Schedule the cleanup (if pg_cron is enabled in Supabase)
-- If not enabled, we can trigger this via a daily API call from cron-job.org
-- SELECT cron.schedule('aggressive-cleanup', '0 */6 * * *', 'SELECT public.aggressive_cleanup()');
