'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const role = data.user?.user_metadata?.role;
    if (role === 'student') {
      router.replace('/student');
      return;
    }
    if (role === 'admin' || role === 'staff' || role === 'teacher') {
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
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-12 flex-col justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xl font-bold">Excellence Online College</p>
            <p className="text-blue-200 text-sm">Student Management System</p>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Manage students, courses, and academic records in one place.
          </h2>
          <p className="mt-4 text-blue-200 text-lg">
            Integrated with your Moodle LMS at lms.excellenceonlinecollege.com
          </p>
        </div>
        <p className="text-sm text-blue-300">© 2026 Excellence Online College</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white font-bold">
              EOC
            </div>
            <div>
              <p className="font-bold text-slate-900">Excellence Online College</p>
              <p className="text-sm text-slate-500">Student MIS</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@excellenceonlinecollege.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Staff?{' '}
            <Link href="/signup" className="font-medium text-blue-700 hover:underline">
              Create staff account
            </Link>
            {' · '}
            Student?{' '}
            <Link href="/student/signup" className="font-medium text-blue-700 hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
