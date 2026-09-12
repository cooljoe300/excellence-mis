-- User Notifications Table
-- General notification system for all users (students, staff, admins)

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'system')),
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_notifications_user_idx ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS user_notifications_read_idx ON public.user_notifications(read);
CREATE INDEX IF NOT EXISTS user_notifications_type_idx ON public.user_notifications(type);
CREATE INDEX IF NOT EXISTS user_notifications_created_at_idx ON public.user_notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications" ON public.user_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all notifications" ON public.user_notifications
  FOR SELECT TO authenticated
  USING (is_staff_or_admin());

CREATE POLICY "Users can mark own notifications as read" ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can manage all notifications" ON public.user_notifications
  FOR ALL TO authenticated
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification RECORD;
BEGIN
  -- Get the notification and verify ownership
  SELECT * INTO v_notification
  FROM public.user_notifications
  WHERE id = p_notification_id;

  IF v_notification IS NULL THEN
    RETURN jsonb_build_object('error', 'Notification not found');
  END IF;

  -- Check if user owns the notification or is staff/admin
  IF NOT (auth.uid() = v_notification.user_id OR is_staff_or_admin()) THEN
    RETURN jsonb_build_object('error', 'You do not have permission to update this notification');
  END IF;

  -- Mark as read
  UPDATE public.user_notifications
  SET read = TRUE, read_at = NOW()
  WHERE id = p_notification_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_as_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) TO authenticated;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if user owns the notifications or is staff/admin
  IF NOT (auth.uid() = p_user_id OR is_staff_or_admin()) THEN
    RETURN jsonb_build_object('error', 'You do not have permission to update these notifications');
  END IF;

  -- Mark all as read
  UPDATE public.user_notifications
  SET read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_all_notifications_as_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read(UUID) TO authenticated;

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
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

  INSERT INTO public.user_notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
