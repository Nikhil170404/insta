-- Follow Tracking Table
-- Tracks users who have followed the account (via webhooks)

CREATE TABLE IF NOT EXISTS public.follow_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    follower_instagram_id VARCHAR(255) NOT NULL,
    follower_username VARCHAR(255),
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    unfollowed_at TIMESTAMPTZ,
    is_following BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, follower_instagram_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_follow_tracking_user_follower 
ON public.follow_tracking(user_id, follower_instagram_id, is_following);

-- Update automation settings for follow-gate
ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS require_follow BOOLEAN DEFAULT false;

-- Add follow tracking to dm_logs
ALTER TABLE public.dm_logs 
ADD COLUMN IF NOT EXISTS follow_gate_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followed_after_gate BOOLEAN DEFAULT false;

-- Comments
COMMENT ON TABLE public.follow_tracking IS 'Tracks Instagram followers via webhook events for follow-gate feature';
COMMENT ON COLUMN public.follow_tracking.is_following IS 'Current follow status - updated on follow/unfollow events';
