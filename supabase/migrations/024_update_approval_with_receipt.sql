-- Update approve_fee_payment_submission to automatically generate receipt numbers
-- This ensures that when admin approves a payment, it automatically becomes PAID with a receipt

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
  v_receipt_number TEXT;
  v_year INTEGER;
  v_prefix TEXT;
  v_last_receipt RECORD;
  v_next_number INTEGER;
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

  -- Generate receipt number if payment is being marked as paid and doesn't have one
  IF v_status = 'paid' AND v_fee.receipt_number IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    v_prefix := 'EOC/RCP/' || v_year || '/';
    
    -- Get the last receipt number for this year
    SELECT receipt_number INTO v_last_receipt
    FROM public.fee_payments
    WHERE receipt_number LIKE v_prefix || '%'
    ORDER BY receipt_number DESC
    LIMIT 1;
    
    v_next_number := 1;
    IF v_last_receipt.receipt_number IS NOT NULL THEN
      v_next_number := TO_NUMBER(SPLIT_PART(v_last_receipt.receipt_number, '/', 4), '999999') + 1;
    END IF;
    
    v_receipt_number := v_prefix || LPAD(v_next_number::TEXT, 6, '0');
  ELSE
    v_receipt_number := v_fee.receipt_number;
  END IF;

  -- Update the fee payment
  UPDATE public.fee_payments
  SET
    amount_paid = v_new_paid,
    status = v_status,
    payment_method = v_submission.payment_method,
    reference_number = v_submission.reference_number,
    paid_date = CASE WHEN v_new_paid > 0 THEN CURRENT_DATE ELSE paid_date END,
    receipt_number = COALESCE(v_receipt_number, receipt_number),
    receipt_date = CASE WHEN v_status = 'paid' THEN CURRENT_DATE ELSE receipt_date END,
    invoice_date = COALESCE(invoice_date, CURRENT_DATE),
    updated_at = NOW()
  WHERE id = v_fee.id;

  -- Update the submission status
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
    'status', v_status,
    'receipt_number', v_receipt_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_fee_payment_submission(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_fee_payment_submission(UUID) TO authenticated;
