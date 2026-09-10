'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function changePassword(formData: {
  currentPassword: string;
  newPassword: string;
}) {
  const { currentPassword, newPassword } = formData;

  if (newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters.' };
  }

  if (currentPassword === newPassword) {
    return { error: 'New password must be different from current password.' };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  if (!user) {
    return { error: 'You must be logged in to change your password.' };
  }

  // Verify current password by re-authenticating
  const { error: signInError } = await (supabase.auth as any).signInWithPassword({
    email: user.email || '',
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Current password is incorrect.' };
  }

  // Update password using admin client for better security
  const { error: updateError } = await ((admin as any).auth.admin).updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
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

  return { success: true };
}
