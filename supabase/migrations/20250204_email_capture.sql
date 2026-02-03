-- Email Capture Feature Migration
-- Create leads table for email capture

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
    
    instagram_user_id VARCHAR(255) NOT NULL,
    instagram_username VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    
    source VARCHAR(50) DEFAULT 'instagram_dm',
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_automation_id ON public.leads(automation_id);

-- Add email capture settings to automations
ALTER TABLE public.automations
ADD COLUMN IF NOT EXISTS capture_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_prompt_message TEXT DEFAULT 'To get your reward, please share your email:';

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own leads"
    ON public.leads FOR SELECT
    USING (auth.uid()::text = user_id::text OR user_id IN (
        SELECT id FROM public.users WHERE instagram_user_id = auth.uid()::text
    ));

CREATE POLICY "Users can insert their own leads"
    ON public.leads FOR INSERT
    WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE public.leads IS 'Email and contact leads captured from Instagram DMs';
COMMENT ON COLUMN public.leads.source IS 'Where the lead came from (instagram_dm, story_reply, etc)';
