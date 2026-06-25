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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? getRoleFromUser(user);
  if (role === 'admin' || role === 'staff' || role === 'teacher' || role === 'student') {
    return role;
  }
  return null;
}

export function isSelfRegisteredStudent(student: { profile_id: string | null }) {
  return !!student.profile_id;
}
