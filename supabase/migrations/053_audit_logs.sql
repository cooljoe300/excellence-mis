-- Audit Logs System
-- Provides a centralized audit trail for all important administrative and system actions

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_role TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  previous_value JSONB,
  new_value JSONB,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_module_idx ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS audit_logs_entity_type_idx ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS audit_logs_entity_id_idx ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_status_idx ON public.audit_logs(status);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_module_created_at_idx ON public.audit_logs(module, created_at DESC);

-- Add comments
COMMENT ON TABLE public.audit_logs IS 'Centralized audit trail for all important administrative and system actions';
COMMENT ON COLUMN public.audit_logs.user_id IS 'Profile ID of the user who performed the action';
COMMENT ON COLUMN public.audit_logs.user_role IS 'Role of the user at the time of the action';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed (e.g., create, update, delete, login, logout)';
COMMENT ON COLUMN public.audit_logs.module IS 'Module/section affected (e.g., students, enrollments, fees, settings)';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type of entity affected (e.g., student, course, enrollment)';
COMMENT ON COLUMN public.audit_logs.entity_id IS 'ID of the entity affected';
COMMENT ON COLUMN public.audit_logs.entity_name IS 'Human-readable name of the entity affected';
COMMENT ON COLUMN public.audit_logs.previous_value IS 'Previous state/value before the action (JSON)';
COMMENT ON COLUMN public.audit_logs.new_value IS 'New state/value after the action (JSON)';
COMMENT ON COLUMN public.audit_logs.details IS 'Additional details or reason for the action';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP address of the user';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'User agent string from the browser';
COMMENT ON COLUMN public.audit_logs.status IS 'Status of the action (success, failure, pending)';
COMMENT ON COLUMN public.audit_logs.error_message IS 'Error message if the action failed';
COMMENT ON COLUMN public.audit_logs.created_at IS 'Timestamp when the action was performed';

-- Create a function to insert audit logs
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id UUID,
  p_user_role TEXT,
  p_action TEXT,
  p_module TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_previous_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_role,
    action,
    module,
    entity_type,
    entity_id,
    entity_name,
    previous_value,
    new_value,
    details,
    ip_address,
    user_agent,
    status,
    error_message
  ) VALUES (
    p_user_id,
    p_user_role,
    p_action,
    p_module,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_previous_value,
    p_new_value,
    p_details,
    p_ip_address,
    p_user_agent,
    p_status,
    p_error_message
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Grant execute permission on the function
REVOKE ALL ON FUNCTION public.log_audit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit TO authenticated;

COMMENT ON FUNCTION public.log_audit IS 'Insert an audit log entry';

-- Create a function to get audit logs with filtering
CREATE OR REPLACE FUNCTION get_audit_logs(
  p_search TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_module TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  action TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  previous_value JSONB,
  new_value JSONB,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    p.email as user_email,
    p.full_name as user_name,
    al.user_role,
    al.action,
    al.module,
    al.entity_type,
    al.entity_id,
    al.entity_name,
    al.previous_value,
    al.new_value,
    al.details,
    al.ip_address,
    al.user_agent,
    al.status,
    al.error_message,
    al.created_at
  FROM audit_logs al
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE (p_search IS NULL OR 
        al.action ILIKE '%' || p_search || '%' OR
        al.module ILIKE '%' || p_search || '%' OR
        al.entity_type ILIKE '%' || p_search || '%' OR
        al.entity_name ILIKE '%' || p_search || '%' OR
        p.full_name ILIKE '%' || p_search || '%' OR
        p.email ILIKE '%' || p_search || '%')
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_module IS NULL OR al.module = p_module)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_status IS NULL OR al.status = p_status)
    AND (p_date_from IS NULL OR al.created_at >= p_date_from)
    AND (p_date_to IS NULL OR al.created_at <= p_date_to + INTERVAL '1 day')
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission on the function
REVOKE ALL ON FUNCTION public.get_audit_logs FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audit_logs TO authenticated;

COMMENT ON FUNCTION public.get_audit_logs IS 'Get audit logs with optional filtering';

-- Create a function to count audit logs for pagination
CREATE OR REPLACE FUNCTION count_audit_logs(
  p_search TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_module TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM audit_logs al
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE (p_search IS NULL OR 
        al.action ILIKE '%' || p_search || '%' OR
        al.module ILIKE '%' || p_search || '%' OR
        al.entity_type ILIKE '%' || p_search || '%' OR
        al.entity_name ILIKE '%' || p_search || '%' OR
        p.full_name ILIKE '%' || p_search || '%' OR
        p.email ILIKE '%' || p_search || '%')
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_module IS NULL OR al.module = p_module)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_status IS NULL OR al.status = p_status)
    AND (p_date_from IS NULL OR al.created_at >= p_date_from)
    AND (p_date_to IS NULL OR al.created_at <= p_date_to + INTERVAL '1 day');
  
  RETURN v_count;
END;
$$;

-- Grant execute permission on the count function
REVOKE ALL ON FUNCTION public.count_audit_logs FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_audit_logs TO authenticated;

COMMENT ON FUNCTION public.count_audit_logs IS 'Count audit logs with the same filtering options as get_audit_logs';

-- Enable RLS on audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only superadmin and admin can view audit logs
CREATE POLICY "Superadmins and admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  )
);

-- Only superadmin and admin can insert audit logs (via the function)
CREATE POLICY "Superadmins and admins can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  )
);

-- No delete policy - audit logs should never be deleted
