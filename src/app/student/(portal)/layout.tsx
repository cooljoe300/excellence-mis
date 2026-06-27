import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRoleFromMetadata } from '@/lib/auth';
import { StudentShell } from '@/components/layout/student-shell';
import { RegisterStudentServiceWorker } from '@/components/student/register-student-sw';

export const metadata: Metadata = {
  title: 'Student Portal | Excellence Online College',
  description: 'Register units, pay fees, and manage your student profile at Excellence Online College.',
  manifest: '/student/manifest.webmanifest',
  applicationName: 'EOC Student',
  appleWebApp: {
    capable: true,
    title: 'EOC Student',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#003380',
};

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

  return (
    <>
      <RegisterStudentServiceWorker />
      <StudentShell userName={userName}>{children}</StudentShell>
    </>
  );
}
