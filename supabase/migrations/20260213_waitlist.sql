-- Waitlist table for pre-launch signups
-- First 25 get 1 month Pro free, positions 26-50 get 1 month Starter free
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    position SERIAL,
    instagram_username TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    reward_tier TEXT, -- 'pro', 'starter', or null (no reward, position > 50)
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_by_user_id UUID REFERENCES users(id),
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one entry per Instagram username
CREATE UNIQUE INDEX idx_waitlist_instagram_username ON waitlist (LOWER(instagram_username));

-- Unique constraint: one entry per WhatsApp number
CREATE UNIQUE INDEX idx_waitlist_whatsapp ON waitlist (whatsapp_number);

-- Index for quick position lookups
CREATE INDEX idx_waitlist_position ON waitlist (position);

-- Index for unclaimed rewards lookup during login
CREATE INDEX idx_waitlist_unclaimed ON waitlist (is_claimed, reward_tier) WHERE is_claimed = FALSE AND reward_tier IS NOT NULL;

-- Function to auto-assign reward tier based on position
CREATE OR REPLACE FUNCTION assign_waitlist_reward()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.position <= 25 THEN
        NEW.reward_tier := 'pro';
    ELSIF NEW.position <= 50 THEN
        NEW.reward_tier := 'starter';
    ELSE
        NEW.reward_tier := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_waitlist_reward
    BEFORE INSERT ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION assign_waitlist_reward();

-- RPC to get waitlist stats (total count, spots remaining)
CREATE OR REPLACE FUNCTION get_waitlist_stats()
RETURNS JSONB AS $$
DECLARE
    total_count INT;
    pro_remaining INT;
    starter_remaining INT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM waitlist;

    SELECT GREATEST(0, 25 - COUNT(*)) INTO pro_remaining
    FROM waitlist WHERE position <= 25;

    SELECT GREATEST(0, 25 - COUNT(*)) INTO starter_remaining
    FROM waitlist WHERE position > 25 AND position <= 50;

    RETURN jsonb_build_object(
        'total_signups', total_count,
        'pro_spots_left', pro_remaining,
        'starter_spots_left', starter_remaining,
        'total_reward_spots_left', pro_remaining + starter_remaining
    );
END;
$$ LANGUAGE plpgsql;
