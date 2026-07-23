-- Add receipt_number column to fee_payments for official receipt tracking

ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS fee_payments_receipt_number_idx
  ON public.fee_payments(receipt_number);

-- Add a comment to document the purpose
COMMENT ON COLUMN public.fee_payments.receipt_number IS 'Unique receipt number for official fee receipts (e.g., EOC/RCP/2026/000001)';
