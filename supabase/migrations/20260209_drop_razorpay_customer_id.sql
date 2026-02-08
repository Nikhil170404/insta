-- Drop unused razorpay_customer_id column
ALTER TABLE public.users DROP COLUMN IF EXISTS razorpay_customer_id;
