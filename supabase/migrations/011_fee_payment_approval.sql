-- Student payment submissions require admin approval before updating fee balances

ALTER TABLE public.fee_payment_submissions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

UPDATE public.fee_payment_submissions SET status = 'approved' WHERE status = 'pending';

ALTER TABLE public.fee_payment_submissions
  DROP CONSTRAINT IF EXISTS fee_payment_submissions_status_check;

ALTER TABLE public.fee_payment_submissions
  ADD CONSTRAINT fee_payment_submissions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE OR REPLACE FUNCTION public.submit_student_fee_payment(
  p_fee_payment_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_reference_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_fee RECORD;
  v_pending_total DECIMAL;
  v_available DECIMAL;
  v_submission_id UUID;
  v_method TEXT;
  v_reference TEXT;
BEGIN
  IF NOT is_student() THEN
    RETURN jsonb_build_object('error', 'Only students can submit payments.');
  END IF;

  v_method := btrim(COALESCE(p_payment_method, ''));
  v_reference := btrim(COALESCE(p_reference_number, ''));

  IF v_method = '' THEN
    RETURN jsonb_build_object('error', 'Payment method is required.');
  END IF;

  IF v_reference = '' THEN
    RETURN jsonb_build_object('error', 'Transaction / reference code is required.');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Amount must be greater than zero.');
  END IF;

  SELECT s.id INTO v_student_id
  FROM public.students s
  JOIN public.fee_payments fp ON fp.student_id = s.id
  WHERE fp.id = p_fee_payment_id
    AND s.profile_id = auth.uid();

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Fee record not found.');
  END IF;

  SELECT * INTO v_fee
  FROM public.fee_payments
  WHERE id = p_fee_payment_id
  FOR UPDATE;

  IF v_fee.amount_paid >= v_fee.amount THEN
    RETURN jsonb_build_object('error', 'This invoice is already paid in full.');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_pending_total
  FROM public.fee_payment_submissions
  WHERE fee_payment_id = p_fee_payment_id
    AND status = 'pending';

  v_available := v_fee.amount - v_fee.amount_paid - v_pending_total;

  IF p_amount > v_available THEN
    RETURN jsonb_build_object(
      'error',
      format('Amount exceeds available balance of %s (including pending submissions).', v_available)
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.fee_payment_submissions
    WHERE fee_payment_id = p_fee_payment_id
      AND status = 'pending'
      AND lower(reference_number) = lower(v_reference)
  ) THEN
    RETURN jsonb_build_object('error', 'This reference code is already pending approval.');
  END IF;

  INSERT INTO public.fee_payment_submissions (
    fee_payment_id, student_id, amount, payment_method, reference_number, status
  )
  VALUES (p_fee_payment_id, v_student_id, p_amount, v_method, v_reference, 'pending')
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'status', 'pending',
    'pending_amount', p_amount,
    'balance', GREATEST(v_fee.amount - v_fee.amount_paid, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_fee_payment_submission(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission RECORD;
  v_fee RECORD;
  v_new_paid DECIMAL;
  v_status payment_status;
BEGIN
  IF NOT is_staff_or_admin() THEN
    RETURN jsonb_build_object('error', 'Only staff can approve payments.');
  END IF;

  SELECT * INTO v_submission
  FROM public.fee_payment_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF v_submission IS NULL THEN
    RETURN jsonb_build_object('error', 'Payment submission not found.');
  END IF;

  IF v_submission.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'This submission has already been processed.');
  END IF;

  SELECT * INTO v_fee
  FROM public.fee_payments
  WHERE id = v_submission.fee_payment_id
  FOR UPDATE;

  IF v_fee IS NULL THEN
    RETURN jsonb_build_object('error', 'Fee record not found.');
  END IF;

  v_new_paid := v_fee.amount_paid + v_submission.amount;

  IF v_new_paid > v_fee.amount THEN
    RETURN jsonb_build_object('error', 'Approved amount would exceed the invoice total.');
  END IF;

  IF v_new_paid >= v_fee.amount THEN
    v_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  UPDATE public.fee_payments
  SET
    amount_paid = v_new_paid,
    status = v_status,
    payment_method = v_submission.payment_method,
    reference_number = v_submission.reference_number,
    paid_date = CASE WHEN v_new_paid > 0 THEN CURRENT_DATE ELSE paid_date END,
    updated_at = NOW()
  WHERE id = v_fee.id;

  UPDATE public.fee_payment_submissions
  SET
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = auth.uid()
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'amount_paid', v_new_paid,
    'balance', GREATEST(v_fee.amount - v_new_paid, 0),
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_fee_payment_submission(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_fee_payment_submission(UUID) TO authenticated;
