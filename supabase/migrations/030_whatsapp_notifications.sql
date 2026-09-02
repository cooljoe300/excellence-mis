-- WhatsApp Notifications Table for Payment Approval Workflow
-- This table logs all WhatsApp notifications sent for payment approvals

CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('PAYMENT_PENDING_APPROVAL', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED')),
  template_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'twilio',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS whatsapp_notifications_payment_idx ON public.whatsapp_notifications(payment_id);
CREATE INDEX IF NOT EXISTS whatsapp_notifications_student_idx ON public.whatsapp_notifications(student_id);
CREATE INDEX IF NOT EXISTS whatsapp_notifications_status_idx ON public.whatsapp_notifications(status);
CREATE INDEX IF NOT EXISTS whatsapp_notifications_type_idx ON public.whatsapp_notifications(notification_type);
CREATE INDEX IF NOT EXISTS whatsapp_notifications_created_at_idx ON public.whatsapp_notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view all notifications" ON public.whatsapp_notifications
  FOR SELECT TO authenticated
  USING (is_staff_or_admin());

CREATE POLICY "Staff can manage notifications" ON public.whatsapp_notifications
  FOR ALL TO authenticated
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

-- Trigger for updated_at
CREATE TRIGGER whatsapp_notifications_updated_at
  BEFORE UPDATE ON public.whatsapp_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add WhatsApp settings to system_settings
INSERT INTO public.system_settings(key, value)
VALUES
  ('whatsapp_enabled', 'false'),
  ('whatsapp_provider', 'twilio'),
  ('whatsapp_finance_phone', ''),
  ('whatsapp_enable_payment_pending', 'true'),
  ('whatsapp_enable_payment_approved', 'true'),
  ('whatsapp_enable_payment_rejected', 'true')
ON CONFLICT (key) DO NOTHING;