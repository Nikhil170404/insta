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
