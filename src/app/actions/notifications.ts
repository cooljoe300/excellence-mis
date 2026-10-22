'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  link: string | null;
  read: boolean;
  created_at: string;
  read_at: string | null;
}

export async function getUserNotifications(limit: number = 20) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  if (!user) {
    return [];
  }

  const { data: notifications, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (notifications as UserNotification[]) || [];
}

export async function getUnreadNotificationCount() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error fetching notification count:', error);
    return 0;
  }

  return count || 0;
}

export async function getPendingApprovalNotificationCount() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  if (!user) {
    return 0;
  }

  // Check if user is staff/admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['superadmin', 'admin', 'staff', 'teacher'].includes(profile.role)) {
    return 0;
  }

  // Count pending fee payment submissions
  const { count, error } = await supabase
    .from('fee_payment_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending approval count:', error);
    return 0;
  }

  return count || 0;
}

export async function syncPendingApprovalNotifications() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  // Check if user is staff/admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['superadmin', 'admin', 'staff', 'teacher'].includes(profile.role)) {
    return { success: false, error: 'User not authorized' };
  }

  // Get all pending fee payment submissions
  const { data: pendingSubmissions, error: submissionsError } = await supabase
    .from('fee_payment_submissions')
    .select('*, student:students(*), fee_payment:fee_payments(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (submissionsError) {
    console.error('Error fetching pending submissions:', submissionsError);
    return { success: false, error: 'Failed to fetch pending submissions' };
  }

  if (!pendingSubmissions || pendingSubmissions.length === 0) {
    return { success: true, synced: 0 };
  }

  // Get existing notification references
  const { data: existingNotifications } = await supabase
    .from('user_notifications')
    .select('id, reference_id')
    .eq('user_id', user.id)
    .eq('type', 'warning')
    .like('title', 'Pending Fee Approval%');

  const existingRefIds = new Set(
    (existingNotifications || []).map((n: any) => n.reference_id)
  );

  let syncedCount = 0;

  // Create notifications for new pending submissions
  for (const submission of pendingSubmissions) {
    const submissionRef = `fee_submission_${submission.id}`;
    
    // Skip if notification already exists
    if (existingRefIds.has(submissionRef)) {
      continue;
    }

    const student = submission.student as any;
    const feePayment = submission.fee_payment as any;

    const title = 'Pending Fee Approval';
    const message = `${student?.first_name} ${student?.last_name} (${student?.student_number}) submitted KES ${submission.amount} for ${feePayment?.description || 'fee payment'}`;
    const link = '/dashboard/fees';

    const { error: createError } = await supabase.from('user_notifications').insert({
      user_id: user.id,
      title,
      message,
      type: 'warning',
      link,
      reference_id: submissionRef,
      read: false,
    });

    if (!createError) {
      syncedCount++;
    }
  }

  // Clean up notifications for submissions that are no longer pending
  const currentRefIds = new Set(
    pendingSubmissions.map((s: any) => `fee_submission_${s.id}`)
  );

  if (currentRefIds.size > 0) {
    const { error: deleteError } = await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'warning')
      .like('title', 'Pending Fee Approval%')
      .not('reference_id', 'in', `(${Array.from(currentRefIds).join(',')})`);

    if (deleteError) {
      console.error('Error cleaning up old notifications:', deleteError);
    }
  } else {
    // If no pending submissions, delete all pending fee approval notifications
    const { error: deleteError } = await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'warning')
      .like('title', 'Pending Fee Approval%');

    if (deleteError) {
      console.error('Error cleaning up old notifications:', deleteError);
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/fees');

  return { success: true, synced: syncedCount };
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('mark_notification_as_read', {
    p_notification_id: notificationId,
  });

  if (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/student');
  revalidatePath('/teacher');

  return data;
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data, error } = await supabase.rpc('mark_all_notifications_as_read', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: 'Failed to mark all notifications as read' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/student');
  revalidatePath('/teacher');

  return data;
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' | 'system' = 'info',
  link?: string,
  referenceId?: string
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link || null,
  });

  if (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/student');
  revalidatePath('/teacher');

  return { success: true, notificationId: data };
}
