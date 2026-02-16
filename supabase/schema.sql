-- ReplyKaro Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (Instagram as primary auth)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Instagram details (primary auth)
  instagram_user_id VARCHAR(255) UNIQUE NOT NULL,
  instagram_username VARCHAR(255) NOT NULL,
  instagram_access_token TEXT NOT NULL,
  instagram_token_expires_at TIMESTAMPTZ NOT NULL,
  profile_picture_url TEXT,

  -- Plan details
  plan_type VARCHAR(20) DEFAULT 'trial',
  plan_expires_at TIMESTAMPTZ,
  
  -- Contact
  email VARCHAR(255),

  -- Payment
  razorpay_customer_id VARCHAR(255),
  razorpay_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'inactive', -- active, halted, cancelled, completed
  subscription_interval VARCHAR(20), -- monthly, yearly

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_plan CHECK (plan_type IN ('trial', 'free', 'starter', 'growth', 'pro', 'paid', 'expired'))
);

-- Indexes
CREATE INDEX idx_users_instagram_user_id ON public.users(instagram_user_id);
CREATE INDEX idx_users_plan_expires ON public.users(plan_expires_at) WHERE plan_type = 'paid';

-- ============================================
-- KEYWORDS TABLE
-- ============================================
CREATE TABLE public.keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  keyword VARCHAR(255) NOT NULL,
  reply_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_keyword CHECK (LENGTH(keyword) > 0 AND LENGTH(keyword) <= 255),
  CONSTRAINT valid_reply CHECK (LENGTH(reply_message) >= 10 AND LENGTH(reply_message) <= 1000)
);

-- Indexes
CREATE INDEX idx_keywords_user_id ON public.keywords(user_id);
CREATE INDEX idx_keywords_active ON public.keywords(user_id, is_active) WHERE is_active = true;

-- ============================================
-- AUTOMATIONS TABLE (Reel-based comment-to-DM)
-- ============================================
CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Media (Reel/Post) details
  media_id VARCHAR(255) NOT NULL,
  media_type VARCHAR(50) DEFAULT 'REELS',
  media_url TEXT,
  media_thumbnail_url TEXT,
  media_caption TEXT,

  -- Trigger settings
  trigger_keyword VARCHAR(255),  -- NULL means any comment triggers
  trigger_type VARCHAR(50) DEFAULT 'keyword',  -- 'keyword' or 'any'

  -- Response settings
  reply_message TEXT NOT NULL,
  comment_reply TEXT,
  button_text VARCHAR(255),
  link_url TEXT,
  require_follow BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,

  -- Analytics
  comment_count INTEGER DEFAULT 0,
  dm_sent_count INTEGER DEFAULT 0,
  dm_failed_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_reply_message CHECK (LENGTH(reply_message) >= 1 AND LENGTH(reply_message) <= 1000)
  -- NOTE: unique_media_per_user moved to partial index (see migration 2026-02-16)
);

-- Indexes
CREATE INDEX idx_automations_user_id ON public.automations(user_id);
CREATE INDEX idx_automations_media_id ON public.automations(media_id);
CREATE INDEX idx_automations_active ON public.automations(user_id, is_active) WHERE is_active = true;

-- ============================================
-- DM LOGS TABLE
-- ============================================
CREATE TABLE public.dm_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  instagram_comment_id VARCHAR(255) NOT NULL,
  instagram_user_id VARCHAR(255) NOT NULL,
  instagram_username VARCHAR(255),

  keyword_matched VARCHAR(255),
  comment_text TEXT,

  reply_sent BOOLEAN DEFAULT false,
  reply_sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_comment UNIQUE(instagram_comment_id)
);

-- Indexes
CREATE INDEX idx_dm_logs_user_id ON public.dm_logs(user_id);
CREATE INDEX idx_dm_logs_created_at ON public.dm_logs(user_id, created_at DESC);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  razorpay_payment_id VARCHAR(255) UNIQUE NOT NULL,
  razorpay_order_id VARCHAR(255),
  razorpay_signature VARCHAR(255),
  razorpay_subscription_id VARCHAR(255),

  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'created',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_status CHECK (status IN ('created', 'paid', 'failed'))
);

-- Indexes
CREATE INDEX idx_payments_user_id ON public.payments(user_id);

-- ============================================
-- RATE LIMITS TABLE
-- ============================================
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  hour_bucket TIMESTAMPTZ NOT NULL,
  dm_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, hour_bucket),
  CONSTRAINT valid_dm_count CHECK (dm_count >= 0 AND dm_count <= 300)
);

-- Indexes
CREATE INDEX idx_rate_limits_user_hour ON public.rate_limits(user_id, hour_bucket);

-- ============================================
-- WEBHOOK QUEUE TABLE
-- ============================================
CREATE TABLE public.webhook_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',

  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_webhook_queue_status ON public.webhook_queue(status, scheduled_at)
  WHERE status IN ('pending', 'processing');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_keywords_updated_at
  BEFORE UPDATE ON public.keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Increment rate limit function
CREATE OR REPLACE FUNCTION increment_rate_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_hour TIMESTAMPTZ := date_trunc('hour', NOW());
  new_count INTEGER;
BEGIN
  INSERT INTO public.rate_limits (user_id, hour_bucket, dm_count)
  VALUES (p_user_id, current_hour, 1)
  ON CONFLICT (user_id, hour_bucket)
  DO UPDATE SET dm_count = rate_limits.dm_count + 1
  RETURNING dm_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current rate limit function
CREATE OR REPLACE FUNCTION get_rate_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_hour TIMESTAMPTZ := date_trunc('hour', NOW());
  current_count INTEGER;
BEGIN
  SELECT dm_count INTO current_count
  FROM public.rate_limits
  WHERE user_id = p_user_id AND hour_bucket = current_hour;

  RETURN COALESCE(current_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Note: Since we're using custom auth (Instagram OAuth),
-- we'll handle authorization in our API routes instead
-- ============================================

-- Enable RLS but allow all operations (we control access in code)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by our API)
-- Service role can do everything (used by our API)
-- RESTRICTED TO service_role ONLY
CREATE POLICY "Service role full access" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.keywords FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.dm_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.payments FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.rate_limits FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.webhook_queue FOR ALL TO service_role USING (true);

-- ============================================
-- MIGRATION: 2025-01-28 - Add multi-step support
-- ============================================
-- ALTER TABLE public.automations ADD COLUMN comment_reply TEXT;
-- ALTER TABLE public.automations ADD COLUMN button_text VARCHAR(255);
-- ALTER TABLE public.automations ADD COLUMN link_url TEXT;
-- ALTER TABLE public.automations ADD CONSTRAINT check_comment_reply CHECK (LENGTH(comment_reply) <= 1000);

-- ============================================
-- MIGRATION: 2025-02-03 - Add follow-gate and click tracking columns
-- ============================================
-- Run these on your Supabase instance to add missing columns:
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS follow_gate_message VARCHAR(500);
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS final_message VARCHAR(500);
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS final_button_text VARCHAR(40);
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Add missing dm_logs columns for follow-gate tracking
ALTER TABLE public.dm_logs ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL;
ALTER TABLE public.dm_logs ADD COLUMN IF NOT EXISTS is_follow_gate BOOLEAN DEFAULT false;
ALTER TABLE public.dm_logs ADD COLUMN IF NOT EXISTS user_is_following BOOLEAN;
ALTER TABLE public.dm_logs ADD COLUMN IF NOT EXISTS followed_after_gate BOOLEAN DEFAULT false;
ALTER TABLE public.dm_logs ADD COLUMN IF NOT EXISTS is_clicked BOOLEAN DEFAULT false;

-- Create unique index for atomic claim (prevents race conditions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dm_logs_unique_user_automation
  ON public.dm_logs(instagram_user_id, automation_id, is_follow_gate)
  WHERE is_follow_gate = false;


-- ============================================
-- MIGRATION: 2025-02-04 - Cleanup Legacy Columns
-- ============================================
-- ALTER TABLE public.users DROP COLUMN IF EXISTS max_comments_per_day;


-- ============================================
-- MIGRATION: 2026-02-08 - Recurring Subscriptions
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_interval VARCHAR(20);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);

-- Add missing constraints
ALTER TABLE public.users ADD CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('inactive', 'active', 'halted', 'cancelled', 'completed', 'expired'));
ALTER TABLE public.users ADD CONSTRAINT valid_subscription_interval CHECK (subscription_interval IN ('monthly', 'yearly') OR subscription_interval IS NULL);
-- Update payments status check to allow 'refunded' (not added yet in file earlier)
ALTER TABLE public.payments ADD CONSTRAINT valid_status CHECK (status IN ('created', 'paid', 'failed', 'refunded'));

-- ============================================
-- MIGRATION: 2026-02-09 - Add Email Column
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);


-- ============================================
-- MIGRATION: 2026-02-09 - Add Subscriptions & Invoices
-- ============================================

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  razorpay_subscription_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  invoice_number VARCHAR(255),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  tax_amount INTEGER DEFAULT 0,
  billing_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_id ON public.subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);


-- ============================================
-- MIGRATION: 2026-02-09 - Fix Expiry Index
-- ============================================

-- Drop the restricted index
DROP INDEX IF EXISTS public.idx_users_plan_expires;

-- Create new index covering all paid/active plan types
CREATE INDEX IF NOT EXISTS idx_users_plan_expires ON public.users(plan_expires_at) 
WHERE plan_type IN ('starter', 'growth', 'pro', 'agency', 'paid');


-- ============================================
-- MIGRATION: 2026-02-09 - Cleanup Plan Types
-- ============================================

-- Migrate existing 'paid' and 'growth' users to 'starter'
UPDATE public.users 
SET plan_type = 'starter' 
WHERE plan_type IN ('paid', 'growth');

-- Migrate 'trial' users to 'free'
UPDATE public.users 
SET plan_type = 'free' 
WHERE plan_type = 'trial';

-- Update the check constraint to only allow valid plans
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_plan;
ALTER TABLE public.users ADD CONSTRAINT valid_plan CHECK (plan_type IN ('free', 'starter', 'pro', 'expired'));


-- ============================================
-- MIGRATION: 2026-02-09 - Drop Unused Column
-- ============================================

-- Drop unused razorpay_customer_id column
ALTER TABLE public.users DROP COLUMN IF EXISTS razorpay_customer_id;


-- ============================================
-- MIGRATION: 2026-02-09 - Add Webhook Logs
-- ============================================

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'received', -- received, processed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at);


-- ============================================
-- MIGRATION: 2026-02-13 - Waitlist System
-- ============================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instagram_username VARCHAR(255) NOT NULL,
  whatsapp_number VARCHAR(20) NOT NULL,
  position INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL,
  redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_waitlist_ig UNIQUE(instagram_username),
  CONSTRAINT unique_waitlist_wa UNIQUE(whatsapp_number),
  CONSTRAINT valid_waitlist_tier CHECK (tier IN ('pro', 'starter', 'discount'))
);

CREATE INDEX IF NOT EXISTS idx_waitlist_username ON public.waitlist(instagram_username);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON public.waitlist(position);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.waitlist FOR ALL TO service_role USING (true);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS waitlist_discount_until TIMESTAMPTZ;


-- ============================================
-- MIGRATION: 2026-02-16 - Fix unique constraint for archived automations
-- ============================================

-- Drop old hard constraint that blocked re-creating automations after deletion
ALTER TABLE public.automations DROP CONSTRAINT IF EXISTS unique_media_per_user;

-- Create partial unique index: only enforce uniqueness for non-archived automations
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_media_per_user_active
  ON public.automations(user_id, media_id)
  WHERE is_archived = false;






