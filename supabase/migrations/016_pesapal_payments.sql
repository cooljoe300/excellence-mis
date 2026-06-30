-- PesaPal online payments (replaces M-Pesa STK push for student portal)

INSERT INTO public.system_settings(key, value)
VALUES ('pesapal_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pesapal_payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  merchant_reference TEXT NOT NULL UNIQUE,
  order_tracking_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  status_code INTEGER,
  payment_method TEXT,
  confirmation_code TEXT,
  result_desc TEXT,
  submission_id UUID REFERENCES public.fee_payment_submissions(id) ON DELETE SET NULL,
  raw_callback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pesapal_payment_tracking_idx
  ON public.pesapal_payment_requests(order_tracking_id);

CREATE INDEX IF NOT EXISTS pesapal_payment_student_idx
  ON public.pesapal_payment_requests(student_id, created_at DESC);

ALTER TABLE public.pesapal_payment_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pesapal_payment_requests'
      AND policyname = 'Students view own pesapal requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students view own pesapal requests" ON public.pesapal_payment_requests
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
    WHERE schemaname = 'public' AND tablename = 'pesapal_payment_requests'
      AND policyname = 'Students create own pesapal requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students create own pesapal requests" ON public.pesapal_payment_requests
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
    WHERE schemaname = 'public' AND tablename = 'pesapal_payment_requests'
      AND policyname = 'Staff manage pesapal requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Staff manage pesapal requests" ON public.pesapal_payment_requests
      FOR ALL
      USING (is_staff_or_admin())
      WITH CHECK (is_staff_or_admin())
    $policy$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.complete_pesapal_payment(
  p_order_tracking_id TEXT,
  p_status_code INTEGER,
  p_confirmation_code TEXT,
  p_payment_method TEXT,
  p_result_desc TEXT,
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
  v_receipt TEXT;
BEGIN
  SELECT * INTO v_request
  FROM public.pesapal_payment_requests
  WHERE order_tracking_id = p_order_tracking_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('error', 'PesaPal payment request not found.');
  END IF;

  IF v_request.status IN ('completed', 'failed', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_request.status,
      'submission_id', v_request.submission_id
    );
  END IF;

  IF p_status_code IS DISTINCT FROM 1 THEN
    UPDATE public.pesapal_payment_requests
    SET
      status = CASE WHEN p_status_code = 3 THEN 'cancelled' ELSE 'failed' END,
      status_code = p_status_code,
      result_desc = p_result_desc,
      raw_callback = p_raw_callback,
      updated_at = NOW()
    WHERE id = v_request.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', CASE WHEN p_status_code = 3 THEN 'cancelled' ELSE 'failed' END,
      'result_desc', p_result_desc
    );
  END IF;

  v_receipt := COALESCE(NULLIF(btrim(p_confirmation_code), ''), p_order_tracking_id);

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
    UPDATE public.pesapal_payment_requests
    SET
      status = 'failed',
      status_code = p_status_code,
      result_desc = 'Paid amount exceeds invoice balance.',
      confirmation_code = v_receipt,
      raw_callback = p_raw_callback,
      updated_at = NOW()
    WHERE id = v_request.id;

    RETURN jsonb_build_object('error', 'Paid amount exceeds invoice balance.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.fee_payment_submissions
    WHERE lower(reference_number) = lower(v_receipt)
  ) THEN
    UPDATE public.pesapal_payment_requests
    SET
      status = 'completed',
      status_code = p_status_code,
      payment_method = COALESCE(p_payment_method, 'PesaPal'),
      confirmation_code = v_receipt,
      result_desc = p_result_desc,
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
    COALESCE(NULLIF(btrim(p_payment_method), ''), 'PesaPal'),
    v_receipt,
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
    payment_method = COALESCE(NULLIF(btrim(p_payment_method), ''), 'PesaPal'),
    reference_number = v_receipt,
    paid_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = v_fee.id;

  UPDATE public.pesapal_payment_requests
  SET
    status = 'completed',
    status_code = p_status_code,
    payment_method = COALESCE(NULLIF(btrim(p_payment_method), ''), 'PesaPal'),
    confirmation_code = v_receipt,
    result_desc = p_result_desc,
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

CREATE OR REPLACE FUNCTION public.update_pesapal_tracking_id(
  p_request_id UUID,
  p_order_tracking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_student() THEN
    RETURN jsonb_build_object('error', 'Only students can update PesaPal requests.');
  END IF;

  UPDATE public.pesapal_payment_requests
  SET
    order_tracking_id = p_order_tracking_id,
    updated_at = NOW()
  WHERE id = p_request_id
    AND student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PesaPal request not found.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_pesapal_payment(TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_pesapal_payment(TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.update_pesapal_tracking_id(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_pesapal_tracking_id(UUID, TEXT) TO authenticated;
