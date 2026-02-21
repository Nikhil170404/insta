-- Add comment_count column
ALTER TABLE public.rate_limits
  ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

ALTER TABLE public.rate_limits
  DROP CONSTRAINT IF EXISTS valid_comment_count;

ALTER TABLE public.rate_limits
  ADD CONSTRAINT valid_comment_count CHECK (comment_count >= 0 AND comment_count <= 10000);

-- Note: Dropping the old constraint on dm_count if it restricts this table's flexibility might be needed if it was checking total row values, but usually it only checks its own column.
-- Let's ensure dm_count constraint is also flexible enough if needed, but the user specifies wide constraint for comment_count.

-- New increment RPC for comment replies
CREATE OR REPLACE FUNCTION increment_comment_rate_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_hour TIMESTAMPTZ := date_trunc('hour', NOW());
  new_count INTEGER;
BEGIN
  INSERT INTO public.rate_limits (user_id, hour_bucket, dm_count, comment_count)
  VALUES (p_user_id, current_hour, 0, 1)
  ON CONFLICT (user_id, hour_bucket)
  DO UPDATE SET comment_count = rate_limits.comment_count + 1
  RETURNING comment_count INTO new_count;
  RETURN COALESCE(new_count, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New decrement RPC for comment replies
CREATE OR REPLACE FUNCTION decrement_comment_rate_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_hour TIMESTAMPTZ := date_trunc('hour', NOW());
  new_count INTEGER;
BEGIN
  UPDATE public.rate_limits
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE user_id = p_user_id AND hour_bucket = current_hour
  RETURNING comment_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New get RPC for comment replies
CREATE OR REPLACE FUNCTION get_comment_rate_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_hour TIMESTAMPTZ := date_trunc('hour', NOW());
  current_count INTEGER;
BEGIN
  SELECT comment_count INTO current_count
  FROM public.rate_limits
  WHERE user_id = p_user_id AND hour_bucket = current_hour;
  RETURN COALESCE(current_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
