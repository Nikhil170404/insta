-- Drop the restricted index
DROP INDEX IF EXISTS public.idx_users_plan_expires;

-- Create new index covering all paid/active plan types
CREATE INDEX idx_users_plan_expires ON public.users(plan_expires_at) 
WHERE plan_type IN ('starter', 'growth', 'pro', 'agency', 'paid');
