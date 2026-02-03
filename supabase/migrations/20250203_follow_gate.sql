-- Follow-Gate Feature Migration
-- Add follow-gate columns to automations table

ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS follow_gate_message TEXT DEFAULT 'Hey! 👋 To unlock this, please follow us first!',
ADD COLUMN IF NOT EXISTS follow_gate_cta TEXT DEFAULT 'Follow & Get Access';

-- Add tracking columns to dm_logs for follow-gate analytics
ALTER TABLE public.dm_logs 
ADD COLUMN IF NOT EXISTS is_follow_gate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_is_following BOOLEAN;

-- Create index for follow-gate analytics
CREATE INDEX IF NOT EXISTS idx_dm_logs_follow_gate 
ON public.dm_logs(is_follow_gate, user_is_following) 
WHERE is_follow_gate = true;

-- Comment for documentation
COMMENT ON COLUMN public.automations.follow_gate_message IS 'Custom message sent when user is not following';
COMMENT ON COLUMN public.automations.follow_gate_cta IS 'CTA button text for follow-gate message';
COMMENT ON COLUMN public.dm_logs.is_follow_gate IS 'Whether this DM was a follow-gate message';
COMMENT ON COLUMN public.dm_logs.user_is_following IS 'Whether user was following at time of DM';
