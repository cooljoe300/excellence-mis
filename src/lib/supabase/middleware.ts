import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getRoleFromMetadata } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

function resolveRole(
  metadata: Record<string, unknown> | undefined,
  profileRole: string | null | undefined
): UserRole | null {
  const role = profileRole ?? getRoleFromMetadata(metadata);
  if (role === 'superadmin' || role === 'admin' || role === 'staff' || role === 'teacher' || role === 'student') {
    return role;
  }
  // Return null for inactive or unknown roles - do NOT default to staff
  return null;
}

function safeNextPath(path: string | null): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}

export async function updateSession(request: NextRequest) {
  try {
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
    const isStudentPwaAsset =
      pathname === '/student/manifest.webmanifest' ||
      pathname === '/student/sw.js' ||
      pathname === '/sw-student.js';
    const isStudentPortal =
      pathname.startsWith('/student') && !isStudentSignup && !isStudentPwaAsset;
    const isHome = pathname === '/';

    if (!user && isHome) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (!user && isDashboard) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (!user && isStudentPortal) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    if (user) {
      let role = getRoleFromMetadata(user.user_metadata);

      // Always check must_change_password for protected routes
      const isProtectedRoute = isDashboard || isStudentPortal || isAuthPage || isStudentSignup || isHome;
      const isChangePasswordPage = pathname === '/change-password';

      if (isProtectedRoute && !isChangePasswordPage) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, must_change_password')
          .eq('id', user.id)
          .maybeSingle();

        // Check if user must change password - this takes priority over everything
        if (profile?.must_change_password) {
          const url = request.nextUrl.clone();
          url.pathname = '/change-password';
          return NextResponse.redirect(url);
        }

        // Resolve role if not in metadata
        if (!role) {
          role = resolveRole(user.user_metadata, profile?.role);
        }
      }

      // If role cannot be determined, redirect to error page
      if (!role && (isDashboard || isStudentPortal || isAuthPage || isStudentSignup || isHome)) {
        const url = request.nextUrl.clone();
        url.pathname = '/role-error';
        return NextResponse.redirect(url);
      }

      if (role === 'student' && isDashboard) {
        const url = request.nextUrl.clone();
        url.pathname = '/student';
        return NextResponse.redirect(url);
      }

      if (role && role !== 'student' && isStudentPortal) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }

      if (isAuthPage) {
        const url = request.nextUrl.clone();
        const next = safeNextPath(request.nextUrl.searchParams.get('next'));
        if (next) {
          url.pathname = next;
          url.search = '';
        } else {
          url.pathname = role === 'student' ? '/student' : '/dashboard';
        }
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

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}
