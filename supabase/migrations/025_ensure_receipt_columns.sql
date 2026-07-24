-- Ensure all receipt-related columns exist on fee_payments table
-- This migration is idempotent and can be run multiple times safely

-- Add receipt_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'fee_payments' 
    AND column_name = 'receipt_number'
  ) THEN
    ALTER TABLE public.fee_payments
      ADD COLUMN receipt_number TEXT UNIQUE;
    
    CREATE INDEX fee_payments_receipt_number_idx
      ON public.fee_payments(receipt_number);
    
    COMMENT ON COLUMN public.fee_payments.receipt_number IS 'Unique receipt number for official fee receipts (e.g., EOC/RCP/2026/000001)';
  END IF;
END $$;

-- Add invoice_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'fee_payments' 
    AND column_name = 'invoice_date'
  ) THEN
    ALTER TABLE public.fee_payments
      ADD COLUMN invoice_date DATE;
    
    COMMENT ON COLUMN public.fee_payments.invoice_date IS 'The date the invoice was originally generated (stored permanently)';
  END IF;
END $$;

-- Add receipt_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'fee_payments' 
    AND column_name = 'receipt_date'
  ) THEN
    ALTER TABLE public.fee_payments
      ADD COLUMN receipt_date DATE;
    
    COMMENT ON COLUMN public.fee_payments.receipt_date IS 'The date the receipt was generated/issued (stored permanently)';
  END IF;
END $$;
