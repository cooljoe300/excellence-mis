'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';
import { Eye, EyeOff } from 'lucide-react';

export default function StudentChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to change your password.');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        setError('Current password is incorrect.');
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Update must_change_password flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update must_change_password flag:', profileError);
        // Continue anyway - password was changed successfully
      }

      // Redirect to student portal
      router.replace('/student');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" href={null} priority className="mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Create Your New Password</h1>
          <p className="mt-2 text-sm text-muted">
            You must create a new password to access the Student Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="Current/Temporary Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Creating Password...' : 'Create New Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
