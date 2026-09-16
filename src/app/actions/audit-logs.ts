'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Revalidate audit logs page after any audit action
export async function revalidateAuditLogs() {
  revalidatePath('/dashboard/audit-logs');
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  actor_type: string | null;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  previous_value: any;
  new_value: any;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface AuditLogsFilters {
  search?: string;
  userId?: string;
  action?: string;
  module?: string;
  entityType?: string;
  actorType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getAuditLogs(filters: AuditLogsFilters = {}, limit = 100, offset = 0) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_audit_logs', {
    p_search: filters.search || null,
    p_user_id: filters.userId || null,
    p_action: filters.action || null,
    p_module: filters.module || null,
    p_entity_type: filters.entityType || null,
    p_actor_type: filters.actorType || null,
    p_status: filters.status || null,
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }

  return data as AuditLog[];
}

export async function countAuditLogs(filters: AuditLogsFilters = {}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('count_audit_logs', {
    p_search: filters.search || null,
    p_user_id: filters.userId || null,
    p_action: filters.action || null,
    p_module: filters.module || null,
    p_entity_type: filters.entityType || null,
    p_actor_type: filters.actorType || null,
    p_status: filters.status || null,
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null,
  });

  if (error) {
    console.error('Error counting audit logs:', error);
    throw new Error('Failed to count audit logs');
  }

  return data as number;
}

export async function logAuditAction(params: {
  userId?: string;
  userRole?: string;
  actorType?: 'ADMIN' | 'STAFF' | 'STUDENT' | 'SYSTEM';
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure' | 'pending';
  errorMessage?: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('log_audit', {
    p_user_id: params.userId || null,
    p_user_role: params.userRole || null,
    p_actor_type: params.actorType || 'STAFF',
    p_action: params.action,
    p_module: params.module,
    p_entity_type: params.entityType || null,
    p_entity_id: params.entityId || null,
    p_entity_name: params.entityName || null,
    p_previous_value: params.previousValue || null,
    p_new_value: params.newValue || null,
    p_details: params.details || null,
    p_ip_address: params.ipAddress || null,
    p_user_agent: params.userAgent || null,
    p_status: params.status || 'success',
    p_error_message: params.errorMessage || null,
  });

  if (error) {
    console.error('Error logging audit action:', error);
    // Don't throw error - audit logging should not break the main flow
    return null;
  }

  return data as string;
}

export async function getAuditLogById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:user_id (
        email,
        full_name,
        role
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching audit log:', error);
    throw new Error('Failed to fetch audit log');
  }

  return data;
}

export async function getAuditLogModules() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('module')
    .not('module', 'is', null);

  if (error) {
    console.error('Error fetching audit log modules:', error);
    throw new Error('Failed to fetch audit log modules');
  }

  // Get unique modules
  const modules = [...new Set(data?.map((log) => log.module) || [])];
  return modules.sort();
}

export async function getAuditLogActions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('action')
    .not('action', 'is', null);

  if (error) {
    console.error('Error fetching audit log actions:', error);
    throw new Error('Failed to fetch audit log actions');
  }

  // Get unique actions
  const actions = [...new Set(data?.map((log) => log.action) || [])];
  return actions.sort();
}

export async function getAuditLogEntityTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('entity_type')
    .not('entity_type', 'is', null);

  if (error) {
    console.error('Error fetching audit log entity types:', error);
    throw new Error('Failed to fetch audit log entity types');
  }

  // Get unique entity types
  const entityTypes = [...new Set(data?.map((log) => log.entity_type) || [])];
  return entityTypes.sort();
}
