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
  link?: string
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
