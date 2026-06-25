import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import type { UserRole } from '@/lib/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name ?? user.email ?? 'User';
  const userRole = (profile?.role as UserRole | undefined) ?? 'staff';

  return (
    <DashboardShell userName={userName} userRole={userRole}>
      {children}
    </DashboardShell>
  );
}
