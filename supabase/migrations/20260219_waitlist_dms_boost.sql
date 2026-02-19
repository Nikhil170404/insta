-- ============================================
-- MIGRATION: 2026-02-19 - Separate DM boost expiry from pricing discount
-- ============================================
-- Problem: waitlist_discount_until (90 days) was used for BOTH:
--   1. 10% pricing discount (should be 90 days)
--   2. 15K DM boost for discount tier (should be 30 days)
-- Fix: Add a dedicated column for DM boost expiry

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS waitlist_dms_boost_until TIMESTAMPTZ;

-- Backfill existing discount-tier users: their DM boost should expire 60 days
-- before their pricing discount (30 days from signup, not 90 days)
UPDATE public.users
SET waitlist_dms_boost_until = waitlist_discount_until - INTERVAL '60 days'
WHERE waitlist_dms_per_month IS NOT NULL
  AND waitlist_discount_until IS NOT NULL
  AND waitlist_dms_boost_until IS NULL;
