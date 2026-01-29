-- Migration: Add DM Queue and Deletion Logs
-- Supporting smart rate limiting and Meta compliance

-- Create DM queue table
CREATE TABLE IF NOT EXISTS public.dm_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  instagram_comment_id TEXT NOT NULL,
  instagram_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_dm_queue_status_scheduled ON public.dm_queue(status, scheduled_send_at);
CREATE INDEX IF NOT EXISTS idx_dm_queue_user_id ON public.dm_queue(user_id);

-- Create deletion logs table for Meta compliance
CREATE TABLE IF NOT EXISTS public.deletion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instagram_user_id TEXT NOT NULL,
  confirmation_code TEXT NOT NULL UNIQUE,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for deletion search
CREATE INDEX IF NOT EXISTS idx_deletion_logs_instagram_id ON public.deletion_logs(instagram_user_id);
