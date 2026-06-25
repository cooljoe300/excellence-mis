import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getRoleFromMetadata } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  metadata: Record<string, unknown> | undefined
): Promise<UserRole | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const role = profile?.role ?? getRoleFromMetadata(metadata);
  if (role === 'admin' || role === 'staff' || role === 'teacher' || role === 'student') {
    return role;
  }
  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup');
  const isDashboard = pathname.startsWith('/dashboard');
  const isStudentSignup = pathname.startsWith('/student/signup');
  const isStudentRegister = pathname.startsWith('/student/register');
  const isStudentPortal = pathname === '/student' || pathname.startsWith('/student/');
  const isHome = pathname === '/';

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (!user && (isStudentRegister || pathname === '/student')) {
    const url = request.nextUrl.clone();
    url.pathname = '/student/signup';
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = await getUserRole(supabase, user.id, user.user_metadata);

    if (role === 'student' && isDashboard) {
      const url = request.nextUrl.clone();
      url.pathname = '/student';
      return NextResponse.redirect(url);
    }

    if (user && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'student' ? '/student' : '/dashboard';
      return NextResponse.redirect(url);
    }

    if (user && isStudentSignup) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'student' ? '/student/register' : '/dashboard';
      return NextResponse.redirect(url);
    }

    if (user && isHome) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'student' ? '/student' : '/dashboard';
      return NextResponse.redirect(url);
    }

    if (role === 'student' && isStudentPortal && pathname === '/student') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (!student && pathname === '/student') {
        const url = request.nextUrl.clone();
        url.pathname = '/student/register';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
