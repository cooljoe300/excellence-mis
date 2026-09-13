-- Add reference_id column to user_notifications for tracking related records
-- This prevents duplicate notifications for the same entity

ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Add index for faster lookups by reference_id
CREATE INDEX IF NOT EXISTS user_notifications_reference_idx ON public.user_notifications(reference_id);

-- Add comment
COMMENT ON COLUMN public.user_notifications.reference_id IS 'External reference ID (e.g., fee_submission_123) to prevent duplicate notifications for the same entity';

-- Drop existing function with 5 parameters (from migration 046)
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT);

-- Recreate create_notification function to support reference_id (6 parameters)
CREATE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Check if caller is staff/admin (only they can create notifications)
  IF NOT is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff and admins can create notifications';
  END IF;

  -- Check if notification with this reference_id already exists
  IF p_reference_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.user_notifications
      WHERE user_id = p_user_id 
        AND reference_id = p_reference_id
        AND read = FALSE
    ) THEN
      -- Return existing notification ID instead of creating duplicate
      SELECT id INTO v_notification_id
      FROM public.user_notifications
      WHERE user_id = p_user_id 
        AND reference_id = p_reference_id
        AND read = FALSE
      LIMIT 1;
      RETURN v_notification_id;
    END IF;
  END;

  INSERT INTO public.user_notifications (user_id, title, message, type, link, reference_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, p_reference_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
