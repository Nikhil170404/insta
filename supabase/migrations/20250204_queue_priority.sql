-- Add priority column to dm_queue
ALTER TABLE dm_queue 
ADD COLUMN priority INTEGER DEFAULT 5;

-- Update existing rows explicitly (optional, default handles new ones)
UPDATE dm_queue SET priority = 5 WHERE priority IS NULL;

-- Create index for faster priority fetching
CREATE INDEX idx_dm_queue_priority ON dm_queue(priority DESC, created_at ASC);
