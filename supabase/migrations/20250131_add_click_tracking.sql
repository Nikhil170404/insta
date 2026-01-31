-- Migration: Add Click Tracking and Automation Association to Logs
-- Run this in Supabase SQL Editor

-- 1. Add click_count to automations
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- 2. Add automation_id and is_clicked to dm_logs
ALTER TABLE public.dm_logs ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL;
ALTER TABLE public.dm_logs ADD COLUMN IF NOT EXISTS is_clicked BOOLEAN DEFAULT false;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_dm_logs_automation_id ON public.dm_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_dm_logs_is_clicked ON public.dm_logs(is_clicked) WHERE is_clicked = true;
