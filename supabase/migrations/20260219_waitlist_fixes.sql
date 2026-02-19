-- ============================================
-- MIGRATION: 2026-02-19 - Waitlist System Fixes
-- ============================================

-- 1. Add UNIQUE constraint on position (prevent duplicate positions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_position_unique ON public.waitlist(position);

-- 2. Add waitlist DMs boost column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS waitlist_dms_per_month INTEGER;

-- 3. Atomic waitlist position claim function
-- Eliminates race condition: counts + inserts in a single transaction
CREATE OR REPLACE FUNCTION claim_waitlist_position(
    p_username VARCHAR,
    p_whatsapp VARCHAR
)
RETURNS TABLE(
    out_position INTEGER,
    out_tier VARCHAR,
    out_id UUID
) AS $$
DECLARE
    v_position INTEGER;
    v_tier VARCHAR;
    v_id UUID;
    v_total_limit INTEGER := 1000;
BEGIN
    -- Lock the table to prevent concurrent inserts from getting same position
    LOCK TABLE public.waitlist IN EXCLUSIVE MODE;

    -- Get next position atomically
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_position FROM public.waitlist;

    -- Determine tier
    IF v_position <= 10 THEN
        v_tier := 'pro';
    ELSIF v_position <= 30 THEN
        v_tier := 'starter';
    ELSIF v_position <= 1000 THEN
        v_tier := 'discount';
    ELSE
        RAISE EXCEPTION 'WAITLIST_FULL' USING ERRCODE = 'P0001';
    END IF;

    -- Insert the entry
    INSERT INTO public.waitlist (instagram_username, whatsapp_number, position, tier)
    VALUES (p_username, p_whatsapp, v_position, v_tier)
    RETURNING id INTO v_id;

    out_position := v_position;
    out_tier := v_tier;
    out_id := v_id;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
