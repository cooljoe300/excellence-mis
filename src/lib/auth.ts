import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/types';

export function getRoleFromMetadata(metadata: Record<string, unknown> | undefined): UserRole | null {
  const metaRole = metadata?.role;
  if (metaRole === 'superadmin' || metaRole === 'admin' || metaRole === 'staff' || metaRole === 'teacher' || metaRole === 'student') {
    return metaRole;
  }
  return null;
}

export function getRoleFromUser(user: User): UserRole | null {
  return getRoleFromMetadata(user.user_metadata);
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const metaRole = getRoleFromUser(user);
  if (metaRole) return metaRole;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role;
  if (role === 'superadmin' || role === 'admin' || role === 'staff' || role === 'teacher' || role === 'student' || role === 'inactive') {
    return role;
  }
  
  // Return null if role cannot be determined - do NOT default to staff
  // This prevents unauthorized access when role is missing
  return null;
}

export function isSelfRegisteredStudent(student: { registration_source: string | null }) {
  return student.registration_source === 'self_registered';
}

export function getRegistrationSourceLabel(source: string | null): string {
  if (source === 'self_registered') return 'Self Registered';
  if (source === 'staff_registered') return 'Registered by Staff';
  return 'Unknown';
}
