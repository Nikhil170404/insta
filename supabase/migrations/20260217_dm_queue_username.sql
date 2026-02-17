-- Migration: Add instagram_username column to dm_queue table
-- Purpose: Allow tracking of Instagram username in queued DMs for fallback dm_log inserts (Issue 3.3)

ALTER TABLE dm_queue ADD COLUMN IF NOT EXISTS instagram_username TEXT DEFAULT NULL;

COMMENT ON COLUMN dm_queue.instagram_username IS 'Instagram username of the DM recipient, for analytics in fallback dm_log inserts';
