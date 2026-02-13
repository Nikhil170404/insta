-- ============================================
-- MIGRATION: 2026-02-13 - Waitlist System
-- ============================================

-- Waitlist table for early bird signups
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instagram_username VARCHAR(255) NOT NULL,
  whatsapp_number VARCHAR(20) NOT NULL,
  position INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL,            -- 'pro', 'starter', 'discount'
  redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_waitlist_ig UNIQUE(instagram_username),
  CONSTRAINT unique_waitlist_wa UNIQUE(whatsapp_number),
  CONSTRAINT valid_waitlist_tier CHECK (tier IN ('pro', 'starter', 'discount'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_username ON public.waitlist(instagram_username);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON public.waitlist(position);

-- RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.waitlist FOR ALL TO service_role USING (true);

-- Add discount tracking to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS waitlist_discount_until TIMESTAMPTZ;
