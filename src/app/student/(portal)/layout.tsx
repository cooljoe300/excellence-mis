import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from '@/lib/auth';
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

  if (!user) redirect('/student/signup');

  const role = await getCurrentUserRole();
  if (role && role !== 'student') redirect('/dashboard');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name ?? user.email ?? 'Student';

  return <StudentShell userName={userName}>{children}</StudentShell>;
}
