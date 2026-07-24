'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';
import { GraduationCap, BookOpen, Users } from 'lucide-react';

function safeNextPath(path: string | null): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (nextPath) {
      router.replace(nextPath);
      return;
    }

    const role = data.user?.user_metadata?.role;
    if (role === 'student') {
      router.replace('/student');
      return;
    }
    if (role === 'superadmin' || role === 'admin' || role === 'staff' || role === 'teacher') {
      router.replace('/dashboard');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user!.id)
      .maybeSingle();

    router.replace(profile?.role === 'student' ? '/student' : '/dashboard');
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6 sm:p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="lg:hidden mb-8">
          <Logo size="md" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">
          {nextPath ? 'Sign in to continue to your requested page' : 'Sign in to your Excellence Online account'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@excellenceonlinecollege.com"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
          {' · '}
          Student?{' '}
          <Link href="/student/signup" className="font-medium text-primary hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export function LoginHero() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#002654] via-[#003380] to-[#004a99] p-12 flex-col justify-between text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-20 right-10 h-48 w-48 rounded-full bg-[#e1a916] blur-3xl" />
      </div>

      <div className="relative rounded-xl bg-white px-4 py-3 inline-flex">
        <Logo size="lg" href={null} priority />
      </div>

      <div className="relative space-y-8">
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Manage students, courses, and academic records in one place.
          </h2>
          <p className="mt-4 text-blue-100 text-lg leading-relaxed">
            Integrated with your Moodle LMS at lms.excellenceonlinecollege.com
          </p>
        </div>

        <div className="grid gap-4">
          {[
            { icon: Users, text: 'Complete student lifecycle management' },
            { icon: BookOpen, text: 'Programs, courses & enrollments' },
            { icon: GraduationCap, text: 'Fees, ID cards & reporting' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-slate-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e1a916]/20">
                <Icon className="h-4 w-4 text-[#e1a916]" />
              </div>
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="relative text-sm text-blue-300">© 2026 Excellence Online College</p>
    </div>
  );
}
