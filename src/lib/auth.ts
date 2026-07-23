import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

export function getRoleFromMetadata(metadata: Record<string, unknown> | undefined): UserRole | null {
  const metaRole = metadata?.role;
  if (metaRole === 'admin' || metaRole === 'staff' || metaRole === 'teacher' || metaRole === 'student') {
    return metaRole;
  }
  return null;
}

export function getRoleFromUser(user: User): UserRole | null {
  return getRoleFromMetadata(user.user_metadata);
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
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
  if (role === 'admin' || role === 'staff' || role === 'teacher' || role === 'student') {
    return role;
  }
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
