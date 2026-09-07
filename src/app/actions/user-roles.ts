'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['superadmin', 'admin', 'staff', 'teacher', 'student'];

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
  can_teach: boolean | null;
  created_at: string;
}

async function requireSuperadmin() {
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
  if (profile?.role !== 'superadmin') return { error: 'Only superadmins can perform this action.', userId: user.id };
  return { error: null, userId: user.id };
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
  if (profile?.role !== 'superadmin' && profile?.role !== 'admin') return { error: 'Only admins can manage user roles.', userId: user.id };
  return { error: null, userId: user.id };
}

export async function getManagedUsers() {
  const gate = await requireAdmin();
  if (gate.error) throw new Error(gate.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, can_teach, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter((row) => isValidRole(String(row.role))).map((row) => ({
    id: row.id as string,
    full_name: row.full_name as string | null,
    email: row.email as string | null,
    role: row.role as UserRole,
    can_teach: row.can_teach as boolean | null,
    created_at: row.created_at as string,
  }));

  // Filter out profiles that have linked student records
  const profilesWithStudents = await supabase
    .from('students')
    .select('profile_id')
    .not('profile_id', 'is', null);

  const studentProfileIds = new Set(
    (profilesWithStudents.data ?? []).map((s) => s.profile_id)
  );

  const filteredRows = rows.filter((row) => !studentProfileIds.has(row.id));

  return filteredRows as ManagedUserRow[];
}

export async function createUser(formData: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  temporaryPassword: string;
  role: string;
}) {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const { firstName, lastName, email, phone, temporaryPassword, role } = formData;

  // Validate role
  if (!isValidRole(role)) return { error: 'Invalid role selected.' };

  // Only superadmin can assign superadmin role
  if (role === 'superadmin') {
    const superadminGate = await requireSuperadmin();
    if (superadminGate.error) return { error: 'Only superadmins can assign the superadmin role.' };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Check if email already exists in auth.users
  const { data: existingAuthUser, error: authCheckError } = await admin.auth.admin.listUsers();
  if (!authCheckError && existingAuthUser.users) {
    const authUserExists = existingAuthUser.users.some(
      (u) => u.email === email.toLowerCase().trim()
    );
    if (authUserExists) {
      return { error: 'A user with this email already exists in the authentication system. Please edit the existing user instead.' };
    }
  }

  // Check if email already exists in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (existingProfile) {
    return { error: 'A user with this email already exists. Please edit the existing user instead.' };
  }

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: `${firstName} ${lastName}`.trim(),
      role,
    },
  });

  if (authError) {
    console.error('Auth user creation error:', authError);
    return { error: authError.message };
  }
  
  if (!authData.user) {
    console.error('Auth user creation failed: no user returned');
    return { error: 'Failed to create user account.' };
  }

  console.log('Auth user created with ID:', authData.user.id);

  // Check if profile already exists for this auth user ID
  const { data: existingProfileForUser } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', authData.user.id)
    .maybeSingle();

  let profileError;
  if (existingProfileForUser) {
    // Profile exists, update it
    console.log('Profile already exists, updating it');
    ({ error: profileError } = await supabase
      .from('profiles')
      .update({
        email: email.toLowerCase().trim(),
        full_name: `${firstName} ${lastName}`.trim(),
        role,
        phone: phone || null,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id));
  } else {
    // Profile doesn't exist, insert it
    console.log('Creating new profile');
    ({ error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        full_name: `${firstName} ${lastName}`.trim(),
        role,
        phone: phone || null,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      }));
  }

  if (profileError) {
    console.error('Profile operation error:', profileError);
    // Rollback auth user creation if profile operation fails
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: `Failed to create profile: ${profileError.message}` };
  }

  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard');

  return { 
    success: true, 
    userId: authData.user.id,
    email: email.toLowerCase().trim(),
    fullName: `${firstName} ${lastName}`.trim(),
    role,
  };
}

export async function updateUserRole(userId: string, role: string, reason?: string) {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  if (!userId) return { error: 'User id is required.' };
  if (!isValidRole(role)) return { error: 'Invalid role selected.' };

  // Only superadmin can assign superadmin role
  if (role === 'superadmin') {
    const superadminGate = await requireSuperadmin();
    if (superadminGate.error) return { error: 'Only superadmins can assign the superadmin role.' };
  }

  if (gate.userId === userId && role !== 'superadmin' && role !== 'admin') {
    return { error: 'You cannot demote your own admin role.' };
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
    if (gate.userId) {
      await logRoleChange({
        userId,
        previousRole: currentRole,
        newRole: role,
        changedBy: gate.userId,
        reason,
      });
    }
  } catch (logError) {
    // Log error but don't fail the role change
    console.error('Failed to log role change:', logError);
  }

  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');

  return { success: true };
}

export async function resetUserPassword(userId: string, temporaryPassword: string) {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  if (!userId) return { error: 'User id is required.' };
  if (!temporaryPassword || temporaryPassword.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  // Update auth user password
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
  });

  if (authError) return { error: authError.message };

  // Set must_change_password to true
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) return { error: profileError.message };

  revalidatePath('/dashboard/users');

  return { success: true };
}

export async function forcePasswordChange(userId: string) {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  if (!userId) return { error: 'User id is required.' };

  const supabase = await createClient();

  // Set must_change_password to true
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) return { error: profileError.message };

  revalidatePath('/dashboard/users');

  return { success: true };
}

export async function deleteUser(userId: string) {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  if (!userId) return { error: 'User id is required.' };

  // Prevent deleting own account
  if (gate.userId === userId) {
    return { error: 'You cannot delete your own account while logged in.' };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Get user info
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return { error: 'User not found.' };
  }

  // Prevent deleting the last admin
  if (user.role === 'admin') {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) return { error: countError.message };
    if (count && count <= 1) {
      return { error: 'The last Super Admin account cannot be deleted.' };
    }
  }

  // Check for associated records
  const checks = await Promise.all([
    supabase.from('students').select('id').eq('profile_id', userId).limit(1),
    supabase.from('profiles').select('id').eq('id', userId).limit(1),
  ]);

  const hasStudentRecords = checks[0].data && checks[0].data.length > 0;

  if (hasStudentRecords) {
    // Use soft delete instead - mark as inactive
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) return { error: updateError.message };

    // Also update auth user metadata and disable the account
    const authUserResult = await admin.auth.admin.getUserById(userId);
    if (authUserResult.data?.user) {
      const currentMeta = (authUserResult.data.user.user_metadata ?? {}) as Record<string, unknown>;
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...currentMeta,
          role: 'inactive',
        },
        // Disable the auth account to prevent login
        email_confirm: false,
      });
    }

    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard');
    return { success: true, softDeleted: true };
  }

  // Hard delete if no associated records
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (deleteError) return { error: deleteError.message };

  // Delete auth user
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    console.error('Failed to delete auth user:', authDeleteError);
    // Continue anyway - profile is deleted
  }

  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard');

  return { success: true };
}

