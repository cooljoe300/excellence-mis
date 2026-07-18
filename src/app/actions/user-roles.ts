'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['admin', 'staff', 'teacher', 'student'];

interface RoleChangeLog {
  userId: string;
  previousRole: string;
  newRole: string;
  changedBy: string;
  reason?: string;
}

async function logRoleChange(data: RoleChangeLog) {
  const supabase = await createClient();
  const { error } = await supabase.from('audit_logs').insert({
    action: 'role_change',
    entity_type: 'user',
    entity_id: data.userId,
    previous_value: data.previousRole,
    new_value: data.newRole,
    performed_by: data.changedBy,
    reason: data.reason,
    created_at: new Date().toISOString(),
  });
  
  if (error) throw error;
}

function isValidRole(value: string): value is UserRole {
  return VALID_ROLES.includes(value as UserRole);
}

export interface ManagedUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.', userId: null as string | null };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return { error: error.message, userId: user.id };
  if (profile?.role !== 'admin') return { error: 'Only admins can manage user roles.', userId: user.id };
  return { error: null, userId: user.id };
}

export async function getManagedUsers() {
  const gate = await requireAdmin();
  if (gate.error) throw new Error(gate.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter((row) => isValidRole(String(row.role))).map((row) => ({
    id: row.id as string,
    full_name: row.full_name as string | null,
    email: row.email as string | null,
    role: row.role as UserRole,
    created_at: row.created_at as string,
  }));

  return rows as ManagedUserRow[];
}

export async function updateUserRole(userId: string, role: string, reason?: string) {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  if (!userId) return { error: 'User id is required.' };
  if (!isValidRole(role)) return { error: 'Invalid role selected.' };

  if (gate.userId === userId && role !== 'admin') {
    return { error: 'You cannot remove your own admin role.' };
  }

  // Prevent removing the last administrator
  const admin = createAdminClient();
  const userRes = await admin.auth.admin.getUserById(userId);
  if (userRes.error || !userRes.data.user) {
    return { error: userRes.error?.message ?? 'User account not found in auth.' };
  }

  const currentRole = (userRes.data.user.user_metadata as Record<string, unknown>)?.role as string;
  const isAdmin = currentRole === 'admin';
  const willBeAdmin = role === 'admin';

  // If demoting an admin, check if they're the last one
  if (isAdmin && !willBeAdmin) {
    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) return { error: countError.message };
    if (count && count <= 1) {
      return { error: 'Cannot remove the last administrator. At least one admin must remain.' };
    }
  }

  const currentMeta = (userRes.data.user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataResult = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMeta,
      role,
    },
  });
  if (metadataResult.error) return { error: metadataResult.error.message };

  const supabase = await createClient();
  const { error: profileError } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (profileError) return { error: profileError.message };

  // Log the role change
  try {
    await logRoleChange({
      userId,
      previousRole: currentRole,
      newRole: role,
      changedBy: gate.userId,
      reason,
    });
  } catch (logError) {
    // Log error but don't fail the role change
    console.error('Failed to log role change:', logError);
  }

  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');

  return { success: true };
}

