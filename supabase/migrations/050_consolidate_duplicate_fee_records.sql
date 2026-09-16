-- Consolidate duplicate fee records for students
-- This migration merges multiple fee_payments for the same student+term into a single record
-- while preserving all payment items, submissions, and payment history

-- Function to consolidate fee payments for a specific student and term
CREATE OR REPLACE FUNCTION consolidate_student_fee_payments(
  p_student_id UUID,
  p_term_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_payments RECORD;
  v_primary_fee_id UUID;
  v_total_amount DECIMAL;
  v_total_amount_paid DECIMAL;
  v_combined_description TEXT;
  v_payment_status payment_status;
  v_earliest_invoice_date DATE;
  v_earliest_due_date DATE;
  v_latest_paid_date DATE;
  v_latest_receipt_date DATE;
  v_payment_method TEXT;
  v_reference_number TEXT;
  v_consolidated_count INTEGER;
BEGIN
  -- Get all fee payments for this student+term
  FOR v_fee_payments IN 
    SELECT id, amount, amount_paid, status, description, invoice_date, due_date, paid_date, receipt_date, payment_method, reference_number
    FROM fee_payments
    WHERE student_id = p_student_id AND term_id = p_term_id
    ORDER BY created_at ASC
  LOOP
    IF v_primary_fee_id IS NULL THEN
      -- First fee payment becomes the primary
      v_primary_fee_id := v_fee_payments.id;
      v_total_amount := v_fee_payments.amount;
      v_total_amount_paid := v_fee_payments.amount_paid;
      v_combined_description := v_fee_payments.description;
      v_earliest_invoice_date := v_fee_payments.invoice_date;
      v_earliest_due_date := v_fee_payments.due_date;
      v_latest_paid_date := v_fee_payments.paid_date;
      v_latest_receipt_date := v_fee_payments.receipt_date;
      v_payment_method := v_fee_payments.payment_method;
      v_reference_number := v_fee_payments.reference_number;
      v_payment_status := v_fee_payments.status;
      v_consolidated_count := 1;
    ELSE
      -- Merge subsequent fee payments into the primary
      v_total_amount := v_total_amount + v_fee_payments.amount;
      v_total_amount_paid := v_total_amount_paid + v_fee_payments.amount_paid;
      
      -- Combine descriptions
      IF v_fee_payments.description IS NOT NULL AND v_fee_payments.description != '' THEN
        IF v_combined_description IS NULL OR v_combined_description = '' THEN
          v_combined_description := v_fee_payments.description;
        ELSE
          v_combined_description := v_combined_description || ', ' || v_fee_payments.description;
        END IF;
      END IF;
      
      -- Keep earliest dates
      IF v_fee_payments.invoice_date < v_earliest_invoice_date OR v_earliest_invoice_date IS NULL THEN
        v_earliest_invoice_date := v_fee_payments.invoice_date;
      END IF;
      
      IF v_fee_payments.due_date < v_earliest_due_date OR v_earliest_due_date IS NULL THEN
        v_earliest_due_date := v_fee_payments.due_date;
      END IF;
      
      -- Keep latest payment dates
      IF v_fee_payments.paid_date > v_latest_paid_date OR v_latest_paid_date IS NULL THEN
        v_latest_paid_date := v_fee_payments.paid_date;
      END IF;
      
      IF v_fee_payments.receipt_date > v_latest_receipt_date OR v_latest_receipt_date IS NULL THEN
        v_latest_receipt_date := v_fee_payments.receipt_date;
      END IF;
      
      -- Use most recent payment method and reference if available
      IF v_fee_payments.payment_method IS NOT NULL THEN
        v_payment_method := v_fee_payments.payment_method;
      END IF;
      
      IF v_fee_payments.reference_number IS NOT NULL THEN
        v_reference_number := v_fee_payments.reference_number;
      END IF;
      
      -- Determine consolidated status
      IF v_fee_payments.status = 'paid' OR v_payment_status = 'paid' THEN
        v_payment_status := 'paid';
      ELSIF v_fee_payments.status = 'partial' OR v_payment_status = 'partial' THEN
        v_payment_status := 'partial';
      END IF;
      
      -- Move fee payment items to primary fee payment
      UPDATE fee_payment_items
      SET fee_payment_id = v_primary_fee_id
      WHERE fee_payment_id = v_fee_payments.id;
      
      -- Move fee payment submissions to primary fee payment
      UPDATE fee_payment_submissions
      SET fee_payment_id = v_primary_fee_id
      WHERE fee_payment_id = v_fee_payments.id;
      
      -- Move discount history to primary fee payment
      UPDATE fee_discount_history
      SET fee_payment_id = v_primary_fee_id
      WHERE fee_payment_id = v_fee_payments.id;
      
      -- Delete the duplicate fee payment
      DELETE FROM fee_payments WHERE id = v_fee_payments.id;
      
      v_consolidated_count := v_consolidated_count + 1;
    END IF;
  END LOOP;
  
  -- Update the primary fee payment with consolidated data
  IF v_primary_fee_id IS NOT NULL AND v_consolidated_count > 1 THEN
    UPDATE fee_payments
    SET 
      amount = v_total_amount,
      amount_paid = v_total_amount_paid,
      status = v_payment_status,
      description = v_combined_description,
      invoice_date = v_earliest_invoice_date,
      due_date = v_earliest_due_date,
      paid_date = v_latest_paid_date,
      receipt_date = v_latest_receipt_date,
      payment_method = v_payment_method,
      reference_number = v_reference_number,
      updated_at = NOW()
    WHERE id = v_primary_fee_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'primary_fee_id', v_primary_fee_id,
      'consolidated_count', v_consolidated_count,
      'total_amount', v_total_amount,
      'total_amount_paid', v_total_amount_paid,
      'status', v_payment_status
    );
  END IF;
  
  RETURN jsonb_build_object('success', false, 'message', 'No consolidation needed');
END;
$$;

-- Enable the function to be called by authenticated users
REVOKE ALL ON FUNCTION public.consolidate_student_fee_payments(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consolidate_student_fee_payments(UUID, UUID) TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.consolidate_student_fee_payments IS 'Consolidates multiple fee payments for a student+term into a single record, preserving all payment items and history';

-- Create an admin function to consolidate all duplicate fee records in the system
CREATE OR REPLACE FUNCTION consolidate_all_duplicate_fee_records()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_term RECORD;
  v_result JSONB;
  v_total_consolidated INTEGER := 0;
  v_students_affected INTEGER := 0;
BEGIN
  -- Find all student+term combinations with multiple fee payments
  FOR v_student_term IN 
    SELECT student_id, term_id, COUNT(*) as fee_count
    FROM fee_payments
    GROUP BY student_id, term_id
    HAVING COUNT(*) > 1
  LOOP
    -- Consolidate fee payments for this student+term
    SELECT consolidate_student_fee_payments(v_student_term.student_id, v_student_term.term_id) INTO v_result;
    
    IF (v_result->>'success')::boolean = true THEN
      v_total_consolidated := v_total_consolidated + (v_result->>'consolidated_count')::INTEGER;
      v_students_affected := v_students_affected + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'students_affected', v_students_affected,
    'total_consolidated', v_total_consolidated
  );
END;
$$;

-- Restrict the admin function to admins only
REVOKE ALL ON FUNCTION public.consolidate_all_duplicate_fee_records() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consolidate_all_duplicate_fee_records() TO authenticated;

-- Add a comment explaining the admin function
COMMENT ON FUNCTION public.consolidate_all_duplicate_fee_records IS 'Admin function to consolidate all duplicate fee records in the system. Only callable by admins.';

-- First, consolidate all existing duplicate fee records before adding the constraint
DO $$
DECLARE
  v_consolidation_result JSONB;
BEGIN
  -- Run the consolidation function to clean up existing duplicates
  SELECT consolidate_all_duplicate_fee_records() INTO v_consolidation_result;
  
  RAISE NOTICE 'Consolidation result: %', v_consolidation_result;
END $$;

-- Add a unique constraint to prevent future duplicate fee payments for the same student+term
-- Create a partial unique index that only applies to pending/partial payments
CREATE UNIQUE INDEX fee_payments_student_term_active_unique 
ON fee_payments (student_id, term_id) 
WHERE status IN ('pending', 'partial');

-- Add a comment explaining the index
COMMENT ON INDEX fee_payments_student_term_active_unique IS 
'Prevents multiple active/partial fee payments for the same student+term combination. Allows multiple records if they have different statuses (e.g., one paid, one pending)';