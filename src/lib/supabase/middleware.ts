import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getRoleFromMetadata } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

function resolveRole(
  metadata: Record<string, unknown> | undefined,
  profileRole: string | null | undefined
): UserRole | null {
  const role = profileRole ?? getRoleFromMetadata(metadata);
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
    // Prefer JWT metadata — avoids a DB round-trip on most requests
    let role = getRoleFromMetadata(user.user_metadata);

    const needsRoleFromDb =
      !role &&
      (isDashboard || isAuthPage || isStudentSignup || isHome);

    if (needsRoleFromDb) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      role = resolveRole(user.user_metadata, profile?.role);
    }

    if (role === 'student' && isDashboard) {
      const url = request.nextUrl.clone();
      url.pathname = '/student';
      return NextResponse.redirect(url);
    }

    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'student' ? '/student' : '/dashboard';
      return NextResponse.redirect(url);
    }

    if (isStudentSignup) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'student' ? '/student/register' : '/dashboard';
      return NextResponse.redirect(url);
    }

    if (isHome) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'student' ? '/student' : '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
