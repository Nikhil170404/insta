-- Request: Atomic Increment for Automation Stats
-- Description: Increment dm_sent_count, dm_failed_count, and comment_count atomically to prevent race conditions during high traffic.

CREATE OR REPLACE FUNCTION public.increment_automation_stats(
  p_automation_id UUID,
  p_increment_sent INTEGER DEFAULT 0,
  p_increment_failed INTEGER DEFAULT 0,
  p_increment_comment INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.automations
  SET 
    dm_sent_count = dm_sent_count + p_increment_sent,
    dm_failed_count = dm_failed_count + p_increment_failed,
    comment_count = comment_count + p_increment_comment,
    updated_at = NOW()
  WHERE id = p_automation_id;
END;
$$;
