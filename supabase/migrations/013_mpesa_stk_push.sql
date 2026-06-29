-- M-Pesa STK push payment tracking and auto-completion

INSERT INTO public.system_settings(key, value)
VALUES ('mpesa_stk_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.mpesa_stk_push_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  phone_number TEXT NOT NULL,
  account_reference TEXT NOT NULL,
  checkout_request_id TEXT,
  merchant_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  result_code INTEGER,
  result_desc TEXT,
  mpesa_receipt_number TEXT,
  submission_id UUID REFERENCES public.fee_payment_submissions(id) ON DELETE SET NULL,
  raw_callback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mpesa_stk_push_checkout_idx
  ON public.mpesa_stk_push_requests(checkout_request_id);

CREATE INDEX IF NOT EXISTS mpesa_stk_push_student_idx
  ON public.mpesa_stk_push_requests(student_id, created_at DESC);

ALTER TABLE public.mpesa_stk_push_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mpesa_stk_push_requests'
      AND policyname = 'Students view own stk requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students view own stk requests" ON public.mpesa_stk_push_requests
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
    WHERE schemaname = 'public' AND tablename = 'mpesa_stk_push_requests'
      AND policyname = 'Students create own stk requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students create own stk requests" ON public.mpesa_stk_push_requests
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_id AND s.profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mpesa_stk_push_requests'
      AND policyname = 'Staff manage stk requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Staff manage stk requests" ON public.mpesa_stk_push_requests
      FOR ALL
      USING (is_staff_or_admin())
      WITH CHECK (is_staff_or_admin())
    $policy$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.complete_mpesa_stk_payment(
  p_checkout_request_id TEXT,
  p_result_code INTEGER,
  p_result_desc TEXT,
  p_mpesa_receipt TEXT,
  p_raw_callback JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_fee RECORD;
  v_pending_total DECIMAL;
  v_available DECIMAL;
  v_submission_id UUID;
  v_new_paid DECIMAL;
  v_status payment_status;
BEGIN
  SELECT * INTO v_request
  FROM public.mpesa_stk_push_requests
  WHERE checkout_request_id = p_checkout_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('error', 'STK request not found.');
  END IF;

  IF v_request.status IN ('completed', 'failed', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_request.status,
      'submission_id', v_request.submission_id
    );
  END IF;

  IF p_result_code IS DISTINCT FROM 0 THEN
    UPDATE public.mpesa_stk_push_requests
    SET
      status = 'failed',
      result_code = p_result_code,
      result_desc = p_result_desc,
      raw_callback = p_raw_callback,
      updated_at = NOW()
    WHERE id = v_request.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'failed',
      'result_desc', p_result_desc
    );
  END IF;

  IF COALESCE(btrim(p_mpesa_receipt), '') = '' THEN
    UPDATE public.mpesa_stk_push_requests
    SET
      status = 'failed',
      result_code = p_result_code,
      result_desc = 'Missing M-Pesa receipt number.',
      raw_callback = p_raw_callback,
      updated_at = NOW()
    WHERE id = v_request.id;

    RETURN jsonb_build_object('error', 'Missing M-Pesa receipt number.');
  END IF;

  SELECT * INTO v_fee
  FROM public.fee_payments
  WHERE id = v_request.fee_payment_id
  FOR UPDATE;

  IF v_fee IS NULL THEN
    RETURN jsonb_build_object('error', 'Fee record not found.');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_pending_total
  FROM public.fee_payment_submissions
  WHERE fee_payment_id = v_request.fee_payment_id
    AND status = 'pending';

  v_available := v_fee.amount - v_fee.amount_paid - v_pending_total;

  IF v_request.amount > v_available THEN
    UPDATE public.mpesa_stk_push_requests
    SET
      status = 'failed',
      result_code = p_result_code,
      result_desc = 'Paid amount exceeds invoice balance.',
      mpesa_receipt_number = p_mpesa_receipt,
      raw_callback = p_raw_callback,
      updated_at = NOW()
    WHERE id = v_request.id;

    RETURN jsonb_build_object('error', 'Paid amount exceeds invoice balance.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.fee_payment_submissions
    WHERE lower(reference_number) = lower(p_mpesa_receipt)
  ) THEN
    UPDATE public.mpesa_stk_push_requests
    SET
      status = 'completed',
      result_code = p_result_code,
      result_desc = p_result_desc,
      mpesa_receipt_number = p_mpesa_receipt,
      raw_callback = p_raw_callback,
      updated_at = NOW()
    WHERE id = v_request.id;

    RETURN jsonb_build_object('success', true, 'status', 'completed', 'duplicate', true);
  END IF;

  INSERT INTO public.fee_payment_submissions (
    fee_payment_id,
    student_id,
    amount,
    payment_method,
    reference_number,
    status,
    reviewed_at
  )
  VALUES (
    v_request.fee_payment_id,
    v_request.student_id,
    v_request.amount,
    'M-Pesa STK',
    p_mpesa_receipt,
    'approved',
    NOW()
  )
  RETURNING id INTO v_submission_id;

  v_new_paid := v_fee.amount_paid + v_request.amount;

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
    payment_method = 'M-Pesa STK',
    reference_number = p_mpesa_receipt,
    paid_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = v_fee.id;

  UPDATE public.mpesa_stk_push_requests
  SET
    status = 'completed',
    result_code = p_result_code,
    result_desc = p_result_desc,
    mpesa_receipt_number = p_mpesa_receipt,
    submission_id = v_submission_id,
    raw_callback = p_raw_callback,
    updated_at = NOW()
  WHERE id = v_request.id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'submission_id', v_submission_id,
    'amount_paid', v_new_paid,
    'balance', GREATEST(v_fee.amount - v_new_paid, 0),
    'fee_status', v_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_mpesa_stk_push_ids(
  p_request_id UUID,
  p_checkout_request_id TEXT,
  p_merchant_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_student() THEN
    RETURN jsonb_build_object('error', 'Only students can update STK requests.');
  END IF;

  UPDATE public.mpesa_stk_push_requests
  SET
    checkout_request_id = p_checkout_request_id,
    merchant_request_id = p_merchant_request_id,
    updated_at = NOW()
  WHERE id = p_request_id
    AND student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'STK request not found.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_mpesa_stk_payment(TEXT, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_mpesa_stk_payment(TEXT, INTEGER, TEXT, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.update_mpesa_stk_push_ids(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_mpesa_stk_push_ids(UUID, TEXT, TEXT) TO authenticated;
