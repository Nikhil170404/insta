-- Migration: Add decrement_rate_limit function and widen dm_count constraint
-- Purpose: Fix phantom increment bug in rate limiter (rollback over-limit increments)

-- 1. Add decrement function (atomic, matches increment_rate_limit pattern)
CREATE OR REPLACE FUNCTION decrement_rate_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_hour TIMESTAMPTZ := date_trunc('hour', NOW());
  new_count INTEGER;
BEGIN
  UPDATE public.rate_limits
  SET dm_count = GREATEST(dm_count - 1, 0)
  WHERE user_id = p_user_id AND hour_bucket = current_hour
  RETURNING dm_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Widen the dm_count constraint to prevent CHECK violations during transient states
ALTER TABLE public.rate_limits DROP CONSTRAINT IF EXISTS valid_dm_count;
ALTER TABLE public.rate_limits ADD CONSTRAINT valid_dm_count CHECK (dm_count >= 0 AND dm_count <= 500);
