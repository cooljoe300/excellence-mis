'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { Alert } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';

export default function StudentSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // First, check if an existing student record exists with this admission number
      // This handles the case where Admin already registered the student
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('id, admission_number, first_name, last_name, email, profile_id, program:programs(*)')
        .eq('admission_number', admissionNumber.trim().toUpperCase())
        .maybeSingle();

      if (checkError) {
        setError('Error checking for existing student. Please try again.');
        setLoading(false);
        return;
      }

      if (!existingStudent) {
        setError('No student found with this admission number. Please contact administration or check your admission number.');
        setLoading(false);
        return;
      }

      // Check if student already has a portal account linked
      if (existingStudent.profile_id) {
        setError('This admission number is already linked to a portal account. Please sign in instead.');
        setLoading(false);
        return;
      }

      // Verify email matches the existing student record (for security)
      if (existingStudent.email && existingStudent.email.toLowerCase() !== email.toLowerCase().trim()) {
        setError('The email does not match the email on file for this admission number. Please use the email you provided to administration.');
        setLoading(false);
        return;
      }

      // Create the auth account using Supabase Auth (if enabled) or create a custom account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: { role: 'student' },
        },
      });

      if (signUpError) {
        setError(getErrorMessage(signUpError));
        setLoading(false);
        return;
      }

      if (!data.session) {
        setInfo('Account created! Check your email to confirm your account, then sign in.');
        setLoading(false);
        return;
      }

      // Link the auth user to the existing student record
      if (data.user) {
        const { error: linkError } = await supabase
          .from('students')
          .update({ profile_id: data.user.id })
          .eq('id', existingStudent.id);

        if (linkError) {
          console.error('Failed to link existing student:', linkError);
          setError('Account created but failed to link to student record. Please contact administration.');
          setLoading(false);
          return;
        }

        // Successfully linked - redirect to student portal
        router.replace('/student');
        return;
      }

      setLoading(false);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" href={null} priority className="mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Student registration</h1>
          <p className="mt-2 text-sm text-muted">
            Create your portal account using your admission number.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Admission Number"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="EOC/CPAF/008/26"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          {info && <Alert variant="info">{info}</Alert>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
          {' · '}
          Staff?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Staff portal
          </Link>
        </p>
      </div>
    </div>
  );
}
