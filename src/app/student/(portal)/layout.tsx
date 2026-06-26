import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRoleFromMetadata } from '@/lib/auth';
import { StudentShell } from '@/components/layout/student-shell';

export default async function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const metaRole = getRoleFromMetadata(user.user_metadata);
  if (metaRole && metaRole !== 'student') redirect('/dashboard');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? metaRole;
  if (role && role !== 'student') redirect('/dashboard');

  const userName = profile?.full_name ?? user.email ?? 'Student';

  return <StudentShell userName={userName}>{children}</StudentShell>;
}
