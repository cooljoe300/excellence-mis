'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['admin', 'staff', 'teacher', 'student'];

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

export async function updateUserRole(userId: string, role: string) {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  if (!userId) return { error: 'User id is required.' };
  if (!isValidRole(role)) return { error: 'Invalid role selected.' };

  if (gate.userId === userId && role !== 'admin') {
    return { error: 'You cannot remove your own admin role.' };
  }

  const admin = createAdminClient();
  const userRes = await admin.auth.admin.getUserById(userId);
  if (userRes.error || !userRes.data.user) {
    return { error: userRes.error?.message ?? 'User account not found in auth.' };
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

  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');

  return { success: true };
}

