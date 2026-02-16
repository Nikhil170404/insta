-- Add notification settings to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"dm_sent": true, "billing": true, "security": true, "web_push_token": null}';

-- Comment for documentation
COMMENT ON COLUMN public.users.notification_settings IS 'User preferences for notifications and web push tokens';
