-- Fee Discount / Fee Waiver System
-- Allows administrators to apply discounts to student fees
-- Discounts reduce the actual payable amount, not displayed as payments

-- Add discount columns to fee_payments table
ALTER TABLE public.fee_payments
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS discount_reason TEXT,
ADD COLUMN IF NOT EXISTS discounted_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS discounted_at TIMESTAMPTZ;

-- Migrate existing data: set original_amount = amount for existing records
UPDATE public.fee_payments
SET original_amount = amount
WHERE original_amount IS NULL;

-- Add index for discount queries
CREATE INDEX IF NOT EXISTS fee_payments_discounted_by_idx ON public.fee_payments(discounted_by);
CREATE INDEX IF NOT EXISTS fee_payments_discounted_at_idx ON public.fee_payments(discounted_at);

-- Add comments
COMMENT ON COLUMN public.fee_payments.original_amount IS 'Original fee amount before any discounts';
COMMENT ON COLUMN public.fee_payments.discount_amount IS 'Discount amount applied (0 if no discount)';
COMMENT ON COLUMN public.fee_payments.discount_percentage IS 'Discount percentage if discount_type is percentage';
COMMENT ON COLUMN public.fee_payments.discount_type IS 'Type of discount: fixed amount or percentage';
COMMENT ON COLUMN public.fee_payments.discount_reason IS 'Reason for the discount';
COMMENT ON COLUMN public.fee_payments.discounted_by IS 'Profile ID of admin who applied the discount';
COMMENT ON COLUMN public.fee_payments.discounted_at IS 'Timestamp when discount was applied';

-- Create fee_discount_history table for audit trail
CREATE TABLE IF NOT EXISTS public.fee_discount_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  original_amount DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  adjusted_amount DECIMAL(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  applied_by UUID NOT NULL REFERENCES public.profiles(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ
);

-- Add indexes for discount history
CREATE INDEX IF NOT EXISTS fee_discount_history_fee_idx ON public.fee_discount_history(fee_payment_id);
CREATE INDEX IF NOT EXISTS fee_discount_history_student_idx ON public.fee_discount_history(student_id);
CREATE INDEX IF NOT EXISTS fee_discount_history_applied_by_idx ON public.fee_discount_history(applied_by);
CREATE INDEX IF NOT EXISTS fee_discount_history_status_idx ON public.fee_discount_history(status);

-- Enable RLS on discount history
ALTER TABLE public.fee_discount_history ENABLE ROW LEVEL SECURITY;

-- Policies for discount history
CREATE POLICY "Staff can view discount history" ON public.fee_discount_history
  FOR SELECT TO authenticated
  USING (is_staff_or_admin());

CREATE POLICY "Students can view own discount history" ON public.fee_discount_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage discount history" ON public.fee_discount_history
  FOR ALL TO authenticated
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

-- Add comment
COMMENT ON TABLE public.fee_discount_history IS 'Audit trail of all fee discounts applied to students';

-- Function to apply discount to a fee payment
CREATE OR REPLACE FUNCTION public.apply_fee_discount(
  p_fee_payment_id UUID,
  p_discount_type TEXT,
  p_discount_amount DECIMAL,
  p_discount_percentage DECIMAL DEFAULT NULL,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee RECORD;
  v_original_amount DECIMAL;
  v_discount_amount DECIMAL;
  v_adjusted_amount DECIMAL;
  v_user_id UUID;
BEGIN
  -- Only staff/admin can apply discounts
  IF NOT is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff and admins can apply discounts';
  END IF;

  -- Get current user
  v_user_id := auth.uid();

  -- Get the fee payment record
  SELECT * INTO v_fee
  FROM public.fee_payments
  WHERE id = p_fee_payment_id
  FOR UPDATE;

  IF v_fee IS NULL THEN
    RETURN jsonb_build_object('error', 'Fee payment not found');
  END IF;

  -- Set original amount if not already set
  v_original_amount := COALESCE(v_fee.original_amount, v_fee.amount);

  -- Validate discount type
  IF p_discount_type NOT IN ('fixed', 'percentage') THEN
    RETURN jsonb_build_object('error', 'Invalid discount type. Must be fixed or percentage');
  END IF;

  -- Calculate discount amount
  IF p_discount_type = 'fixed' THEN
    v_discount_amount := p_discount_amount;
  ELSE
    v_discount_amount := (v_original_amount * p_discount_percentage / 100);
  END IF;

  -- Validate discount amount
  IF v_discount_amount < 0 THEN
    RETURN jsonb_build_object('error', 'Discount amount cannot be negative');
  END IF;

  IF v_discount_amount > v_original_amount THEN
    RETURN jsonb_build_object('error', 'Discount cannot exceed original fee amount');
  END IF;

  -- Calculate adjusted amount
  v_adjusted_amount := v_original_amount - v_discount_amount;

  -- Update fee payment with discount
  UPDATE public.fee_payments
  SET
    original_amount = v_original_amount,
    discount_amount = v_discount_amount,
    discount_percentage = p_discount_percentage,
    discount_type = p_discount_type,
    discount_reason = p_reason,
    discounted_by = v_user_id,
    discounted_at = NOW(),
    amount = v_adjusted_amount,
    updated_at = NOW()
  WHERE id = p_fee_payment_id;

  -- Create audit record
  INSERT INTO public.fee_discount_history (
    fee_payment_id,
    student_id,
    original_amount,
    discount_amount,
    discount_percentage,
    discount_type,
    adjusted_amount,
    reason,
    applied_by,
    status
  )
  VALUES (
    p_fee_payment_id,
    v_fee.student_id,
    v_original_amount,
    v_discount_amount,
    p_discount_percentage,
    p_discount_type,
    v_adjusted_amount,
    p_reason,
    v_user_id,
    'approved'
  );

  -- Update fee status based on payments
  IF v_fee.amount_paid >= v_adjusted_amount THEN
    UPDATE public.fee_payments
    SET status = 'paid'
    WHERE id = p_fee_payment_id;
  ELSIF v_fee.amount_paid > 0 THEN
    UPDATE public.fee_payments
    SET status = 'partial'
    WHERE id = p_fee_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'original_amount', v_original_amount,
    'discount_amount', v_discount_amount,
    'adjusted_amount', v_adjusted_amount,
    'amount_paid', v_fee.amount_paid,
    'balance', GREATEST(v_adjusted_amount - v_fee.amount_paid, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_fee_discount(UUID, TEXT, DECIMAL, DECIMAL, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_fee_discount(UUID, TEXT, DECIMAL, DECIMAL, TEXT) TO authenticated;

-- Function to remove discount from a fee payment
CREATE OR REPLACE FUNCTION public.remove_fee_discount(p_fee_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee RECORD;
  v_original_amount DECIMAL;
BEGIN
  -- Only staff/admin can remove discounts
  IF NOT is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff and admins can remove discounts';
  END IF;

  -- Get the fee payment record
  SELECT * INTO v_fee
  FROM public.fee_payments
  WHERE id = p_fee_payment_id
  FOR UPDATE;

  IF v_fee IS NULL THEN
    RETURN jsonb_build_object('error', 'Fee payment not found');
  END IF;

  IF v_fee.discount_amount = 0 THEN
    RETURN jsonb_build_object('error', 'No discount to remove');
  END IF;

  -- Restore original amount
  v_original_amount := COALESCE(v_fee.original_amount, v_fee.amount);

  -- Update fee payment to remove discount
  UPDATE public.fee_payments
  SET
    amount = v_original_amount,
    discount_amount = 0,
    discount_percentage = NULL,
    discount_type = NULL,
    discount_reason = NULL,
    discounted_by = NULL,
    discounted_at = NULL,
    updated_at = NOW()
  WHERE id = p_fee_payment_id;

  -- Update fee status based on payments
  IF v_fee.amount_paid >= v_original_amount THEN
    UPDATE public.fee_payments
    SET status = 'paid'
    WHERE id = p_fee_payment_id;
  ELSIF v_fee.amount_paid > 0 THEN
    UPDATE public.fee_payments
    SET status = 'partial'
    WHERE id = p_fee_payment_id;
  ELSE
    UPDATE public.fee_payments
    SET status = 'pending'
    WHERE id = p_fee_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'original_amount', v_original_amount,
    'discount_amount', 0,
    'adjusted_amount', v_original_amount,
    'amount_paid', v_fee.amount_paid,
    'balance', GREATEST(v_original_amount - v_fee.amount_paid, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.remove_fee_discount(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_fee_discount(UUID) TO authenticated;

-- Update balance calculation to account for discounts
CREATE OR REPLACE FUNCTION public.get_fee_balance(p_fee_payment_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee RECORD;
  v_balance DECIMAL;
BEGIN
  SELECT * INTO v_fee
  FROM public.fee_payments
  WHERE id = p_fee_payment_id;

  IF v_fee IS NULL THEN
    RETURN 0;
  END IF;

  -- Balance = adjusted amount (original - discount) - amount paid
  v_balance := COALESCE(v_fee.amount, 0) - COALESCE(v_fee.amount_paid, 0);
  
  RETURN GREATEST(v_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_fee_balance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fee_balance(UUID) TO authenticated;
