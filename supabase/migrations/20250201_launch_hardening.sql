-- Migration: Launch Hardening & Performance Optimization
-- Run this in Supabase SQL Editor

-- 1. Add reply control columns to automations
ALTER TABLE public.automations 
  ADD COLUMN IF NOT EXISTS respond_to_replies BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ignore_self_comments BOOLEAN DEFAULT true;

-- 2. Add performance indexes for analytics and queue processing
CREATE INDEX IF NOT EXISTS idx_dm_logs_user_automation_date 
  ON public.dm_logs(user_id, automation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automations_user_active 
  ON public.automations(user_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_queue_pending_v2
  ON public.webhook_queue(status, scheduled_at) 
  WHERE status = 'pending';

-- 3. Add index for token refresh
CREATE INDEX IF NOT EXISTS idx_users_token_expiry 
  ON public.users(instagram_token_expires_at);
