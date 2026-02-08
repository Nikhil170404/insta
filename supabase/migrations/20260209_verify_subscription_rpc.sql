-- Request: Implement DB Transaction for Subscription Verification
-- Function: verify_subscription_payment
-- Description: Updates user plan, logs payment, and upserts subscription record atomically.

CREATE OR REPLACE FUNCTION public.verify_subscription_payment(
  p_user_id UUID,
  p_razorpay_payment_id TEXT,
  p_razorpay_subscription_id TEXT,
  p_plan_type TEXT,
  p_plan_expires_at TIMESTAMPTZ,
  p_payment_amount INTEGER,
  p_payment_currency TEXT,
  p_payment_status TEXT,
  p_subscription_status TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_plan_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_exists BOOLEAN;
BEGIN
  -- 1. Update User Plan & Status
  UPDATE public.users
  SET 
    plan_type = p_plan_type,
    plan_expires_at = p_plan_expires_at,
    razorpay_subscription_id = p_razorpay_subscription_id,
    subscription_status = 'active',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 2. Insert Payment Record
  INSERT INTO public.payments (
    user_id,
    razorpay_payment_id,
    razorpay_subscription_id,
    amount,
    currency,
    status
  ) VALUES (
    p_user_id,
    p_razorpay_payment_id,
    p_razorpay_subscription_id,
    p_payment_amount,
    p_payment_currency,
    p_payment_status
  );

  -- 3. Upsert Subscription Record
  -- Check if subscription exists by razorpay_subscription_id
  SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE razorpay_subscription_id = p_razorpay_subscription_id) INTO v_subscription_exists;

  IF v_subscription_exists THEN
      UPDATE public.subscriptions SET
        status = p_subscription_status,
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        updated_at = NOW()
      WHERE razorpay_subscription_id = p_razorpay_subscription_id;
  ELSE
      INSERT INTO public.subscriptions (
        user_id,
        razorpay_subscription_id,
        plan_id,
        status,
        current_period_start,
        current_period_end
      ) VALUES (
        p_user_id,
        p_razorpay_subscription_id,
        p_plan_id,
        p_subscription_status,
        p_current_period_start,
        p_current_period_end
      );
  END IF;

  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  -- Automatically rolls back transaction on error
  RAISE;
END;
$$;
