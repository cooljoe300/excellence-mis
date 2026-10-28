-- Fee invoice consistency
--
-- Unit invoices (fee_payments + fee_payment_items) must always add up. Adding
-- units currently updates fee_payments.amount from application code, which
-- silently does nothing when the change is made by a student session: there is
-- an INSERT/SELECT policy on fee_payments for students, but no UPDATE policy.
-- The item rows are inserted, the parent total is not, and the invoice renders
-- with line items but a zero amount.
--
-- This migration makes the database authoritative:
--   * recalculate_fee_payment_totals() derives amount/status/description from
--     the invoice items (SECURITY DEFINER, so it works for every caller).
--   * a trigger on fee_payment_items keeps the parent invoice in sync after
--     every insert, update or delete.
--   * existing invoices that are under-billed are repaired once.

CREATE OR REPLACE FUNCTION public.recalculate_fee_payment_totals(p_fee_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount_paid NUMERIC;
  v_discount NUMERIC;
  v_description TEXT;
  v_paid_date DATE;
  v_item_count INTEGER;
  v_items_total NUMERIC;
  v_amount NUMERIC;
  v_status public.payment_status;
  v_labels TEXT;
  v_note TEXT;
BEGIN
  SELECT amount_paid,
         COALESCE(discount_amount, 0),
         description,
         paid_date
    INTO v_amount_paid, v_discount, v_description, v_paid_date
  FROM public.fee_payments
  WHERE id = p_fee_payment_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_item_count, v_items_total
  FROM public.fee_payment_items
  WHERE fee_payment_id = p_fee_payment_id;

  -- Invoices created by hand have no items and keep their fixed amount.
  -- Unit invoices are recognised by their generated description so that an
  -- invoice whose units were all deregistered still recalculates to zero.
  IF v_item_count = 0
     AND (v_description IS NULL OR v_description NOT LIKE 'Unit registration%') THEN
    RETURN;
  END IF;

  v_amount := GREATEST(v_items_total - v_discount, 0);

  IF v_amount = 0 AND COALESCE(v_amount_paid, 0) = 0 THEN
    v_status := 'waived';
  ELSIF COALESCE(v_amount_paid, 0) >= v_amount THEN
    v_status := 'paid';
  ELSIF COALESCE(v_amount_paid, 0) > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  -- Keep the generated unit list aligned with the units actually billed.
  IF v_description LIKE 'Unit registration%' AND v_item_count > 0 THEN
    SELECT string_agg(c.code || ' — ' || c.name, ', ' ORDER BY c.code)
      INTO v_labels
    FROM public.fee_payment_items i
    JOIN public.courses c ON c.id = i.course_id
    WHERE i.fee_payment_id = p_fee_payment_id;

    IF v_labels IS NOT NULL AND btrim(v_labels) <> '' THEN
      v_note := CASE
        WHEN v_description LIKE '%[Units deregistered%'
          THEN ' [Units deregistered — balance adjusted]'
        ELSE ''
      END;
      v_description := 'Unit registration: ' || v_labels || v_note;
    END IF;
  END IF;

  UPDATE public.fee_payments
  SET amount = v_amount,
      original_amount = v_items_total,
      status = v_status,
      description = v_description,
      paid_date = CASE
        WHEN v_status = 'paid' THEN COALESCE(paid_date, CURRENT_DATE)
        WHEN COALESCE(v_amount_paid, 0) > 0 THEN paid_date
        ELSE NULL
      END
  WHERE id = p_fee_payment_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_fee_payment_totals(UUID) IS
  'Derive a unit invoice amount, status and description from its fee_payment_items.';

-- Only the trigger needs to run this; clients never call it directly.
REVOKE ALL ON FUNCTION public.recalculate_fee_payment_totals(UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_fee_payment_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_fee_payment_totals(OLD.fee_payment_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalculate_fee_payment_totals(NEW.fee_payment_id);

  IF TG_OP = 'UPDATE' AND OLD.fee_payment_id IS DISTINCT FROM NEW.fee_payment_id THEN
    PERFORM public.recalculate_fee_payment_totals(OLD.fee_payment_id);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_fee_payment_totals() IS
  'Keeps the parent fee_payments row in sync with its items.';

DROP TRIGGER IF EXISTS sync_fee_payment_totals ON public.fee_payment_items;
CREATE TRIGGER sync_fee_payment_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_payment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fee_payment_totals();

-- Repairs invoices that are billed below their units. Amounts that are higher
-- than the item total are left alone so manual adjustments and credits are not
-- overwritten.
DO $$
DECLARE
  v_fee RECORD;
BEGIN
  FOR v_fee IN
    SELECT fp.id
    FROM public.fee_payments fp
    JOIN (
      SELECT fee_payment_id, SUM(amount) AS items_total
      FROM public.fee_payment_items
      GROUP BY fee_payment_id
    ) items ON items.fee_payment_id = fp.id
    WHERE COALESCE(fp.description, '') LIKE 'Unit registration%'
      AND fp.amount < items.items_total - COALESCE(fp.discount_amount, 0) - 0.01
  LOOP
    PERFORM public.recalculate_fee_payment_totals(v_fee.id);
  END LOOP;
END $$;
