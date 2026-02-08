-- Request: Fix Amount Constraint Conflict
-- Description: Allow payment amount to be 0 (fallback case) instead of strictly positive.

-- Drop the existing constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS valid_amount;

-- Add the new constraint allowing 0
ALTER TABLE public.payments ADD CONSTRAINT valid_amount CHECK (amount >= 0);
