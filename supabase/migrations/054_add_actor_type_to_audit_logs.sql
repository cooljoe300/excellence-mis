-- Add actor_type field to audit_logs for distinguishing between ADMIN, STAFF, STUDENT, and SYSTEM actions
-- This allows comprehensive tracking of all user activities

-- Add actor_type column
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS actor_type TEXT CHECK (actor_type IN ('ADMIN', 'STAFF', 'STUDENT', 'SYSTEM'));

-- Add index for actor_type filtering
CREATE INDEX IF NOT EXISTS audit_logs_actor_type_idx ON public.audit_logs(actor_type);
CREATE INDEX IF NOT EXISTS audit_logs_actor_type_created_at_idx ON public.audit_logs(actor_type, created_at DESC);

-- Add comment
COMMENT ON COLUMN public.audit_logs.actor_type IS 'Type of actor who performed the action: ADMIN, STAFF, STUDENT, or SYSTEM';

-- Update the log_audit function to accept actor_type
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id UUID DEFAULT NULL,
  p_user_role TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'STAFF',
  p_action TEXT DEFAULT NULL,
  p_module TEXT DEFAULT NULL,
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
    actor_type,
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
    p_actor_type,
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

-- Update the get_audit_logs function to include actor_type
CREATE OR REPLACE FUNCTION get_audit_logs(
  p_search TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_module TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT NULL,
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
  actor_type TEXT,
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
    al.actor_type,
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
    AND (p_actor_type IS NULL OR al.actor_type = p_actor_type)
    AND (p_status IS NULL OR al.status = p_status)
    AND (p_date_from IS NULL OR al.created_at >= p_date_from)
    AND (p_date_to IS NULL OR al.created_at <= p_date_to + INTERVAL '1 day')
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update the count_audit_logs function to include actor_type
CREATE OR REPLACE FUNCTION count_audit_logs(
  p_search TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_module TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT NULL,
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
    AND (p_actor_type IS NULL OR al.actor_type = p_actor_type)
    AND (p_status IS NULL OR al.status = p_status)
    AND (p_date_from IS NULL OR al.created_at >= p_date_from)
    AND (p_date_to IS NULL OR al.created_at <= p_date_to + INTERVAL '1 day');
  
  RETURN v_count;
END;
$$;

-- Update the RLS policy to allow students to be recorded in audit logs but not view them
DROP POLICY IF EXISTS "Superadmins and admins can view audit logs" ON public.audit_logs;
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

-- Students can have their activity recorded (via the function) but cannot view audit logs
DROP POLICY IF EXISTS "Superadmins and admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Superadmins and admins can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  )
  OR
  -- Allow the function to insert for any user (for student activity logging)
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
  )
);
