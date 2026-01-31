-- Webhook batch table (handles burst traffic)
CREATE TABLE IF NOT EXISTS public.webhook_batch (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instagram_user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'comment', 'story_reply', 'message'
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 5, -- 1-10, VIP users get 10
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for fast batch processing
  CONSTRAINT check_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_batch_pending 
  ON public.webhook_batch(processed, priority DESC, created_at) 
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_webhook_batch_user 
  ON public.webhook_batch(instagram_user_id);

CREATE INDEX IF NOT EXISTS idx_webhook_batch_created 
  ON public.webhook_batch(created_at) 
  WHERE processed = false;

-- Update users table with new limits
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS max_comments_per_day INTEGER DEFAULT 100;
