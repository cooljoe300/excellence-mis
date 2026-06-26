-- Student fee payments: paybill settings, payment submissions, and secure submit function

INSERT INTO public.system_settings(key, value)
VALUES
  ('mpesa_paybill', '522522'),
  ('mpesa_account_label', 'Use your admission number as account number'),
  ('bank_name', 'Equity Bank'),
  ('bank_account', '1234567890'),
  ('bank_branch', 'Nairobi')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.fee_payment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fee_payment_submissions_fee_idx
  ON public.fee_payment_submissions(fee_payment_id);

ALTER TABLE public.fee_payment_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fee_payment_submissions'
      AND policyname = 'Students view own submissions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students view own submissions" ON public.fee_payment_submissions
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_id AND s.profile_id = auth.uid()
        )
        OR is_staff_or_admin()
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fee_payment_submissions'
      AND policyname = 'Staff manage submissions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Staff manage submissions" ON public.fee_payment_submissions
      FOR ALL
      USING (is_staff_or_admin())
      WITH CHECK (is_staff_or_admin())
    $policy$;
  END IF;
END $$;

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
  v_new_paid DECIMAL;
  v_status payment_status;
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

  INSERT INTO public.fee_payment_submissions (
    fee_payment_id, student_id, amount, payment_method, reference_number
  )
  VALUES (p_fee_payment_id, v_student_id, p_amount, v_method, v_reference)
  RETURNING id INTO v_submission_id;

  v_new_paid := v_fee.amount_paid + p_amount;

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
    payment_method = v_method,
    reference_number = v_reference,
    paid_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_fee_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'amount_paid', v_new_paid,
    'balance', GREATEST(v_fee.amount - v_new_paid, 0),
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_student_fee_payment(UUID, DECIMAL, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_student_fee_payment(UUID, DECIMAL, TEXT, TEXT) TO authenticated;
