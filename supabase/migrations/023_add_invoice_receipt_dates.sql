-- Add invoice_date and receipt_date columns to fee_payments for proper date tracking

ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS receipt_date DATE;

-- Add comments to document the purpose
COMMENT ON COLUMN public.fee_payments.invoice_date IS 'The date the invoice was originally generated (stored permanently)';
COMMENT ON COLUMN public.fee_payments.receipt_date IS 'The date the receipt was generated/issued (stored permanently)';
