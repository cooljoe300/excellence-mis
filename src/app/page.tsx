import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from '@/lib/auth';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = await getCurrentUserRole();
    redirect(role === 'student' ? '/student' : '/dashboard');
  }

  redirect('/login');
}
