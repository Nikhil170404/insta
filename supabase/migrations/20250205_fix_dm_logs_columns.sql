-- Fix dm_logs columns to match code usage
-- The code uses is_follow_gate and user_is_following, but migration added follow_gate_sent

-- Add missing columns used by processor.ts
ALTER TABLE public.dm_logs
ADD COLUMN IF NOT EXISTS is_follow_gate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_is_following BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL;

-- Add final_message column to automations for customizable "Final Reward" message
ALTER TABLE public.automations
ADD COLUMN IF NOT EXISTS final_message TEXT DEFAULT 'Here is the link you requested! ✨';

-- Index for follow-gate queries (used in hasReceivedFollowGate function)
CREATE INDEX IF NOT EXISTS idx_dm_logs_follow_gate
ON public.dm_logs(user_id, automation_id, instagram_user_id, is_follow_gate)
WHERE is_follow_gate = true;

-- Index for one-DM-per-user lookups
CREATE INDEX IF NOT EXISTS idx_dm_logs_user_automation
ON public.dm_logs(instagram_user_id, keyword_matched, user_id);

-- Unique constraint to prevent duplicate DMs to same user for same automation
-- This prevents race conditions when multiple comments arrive simultaneously
-- Only applies to non-follow-gate DMs (content delivery)
-- Does NOT filter on reply_sent so placeholders also prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_dm_logs_unique_user_automation
ON public.dm_logs(user_id, instagram_user_id, automation_id)
WHERE is_follow_gate = false;

COMMENT ON COLUMN public.dm_logs.is_follow_gate IS 'True if this DM was a follow-gate prompt (not the final content)';
COMMENT ON COLUMN public.dm_logs.user_is_following IS 'Whether the user was following at time of DM';
COMMENT ON COLUMN public.dm_logs.automation_id IS 'Links to the automation that triggered this DM';
