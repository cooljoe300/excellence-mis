'use server';

import { createClient } from '@/lib/supabase/server';
import { whatsappService, NotificationResult, normalizePhoneNumber } from '@/lib/whatsapp-service';

export interface NotificationLog {
  id: string;
  payment_id: string;
  student_id: string;
  recipient_phone: string;
  notification_type: 'PAYMENT_PENDING_APPROVAL' | 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED';
  template_name: string;
  provider: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  provider_message_id?: string;
  sent_at?: string;
  delivered_at?: string;
  failure_reason?: string;
  retry_count: number;
  created_at: string;
}

// Log a WhatsApp notification
export async function logWhatsAppNotification(params: {
  paymentId: string;
  studentId: string;
  recipientPhone: string;
  notificationType: 'PAYMENT_PENDING_APPROVAL' | 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED';
  templateName: string;
  result: NotificationResult;
}): Promise<void> {
  const supabase = await createClient();
  
  const { paymentId, studentId, recipientPhone, notificationType, templateName, result } = params;
  
  const notificationLog = {
    payment_id: paymentId,
    student_id: studentId,
    recipient_phone: normalizePhoneNumber(recipientPhone),
    notification_type: notificationType,
    template_name: templateName,
    provider: process.env.WHATSAPP_PROVIDER || 'twilio',
    status: result.success ? 'sent' : 'failed',
    provider_message_id: result.messageId,
    sent_at: result.success ? new Date().toISOString() : null,
    failure_reason: result.error,
    retry_count: 0,
  };

  const { error } = await supabase.from('whatsapp_notifications').insert(notificationLog);
  
  if (error) {
    console.error('Failed to log WhatsApp notification:', error);
  }
}

// Get notification logs for a specific payment
export async function getPaymentNotificationLogs(paymentId: string): Promise<NotificationLog[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('whatsapp_notifications')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch notification logs:', error);
    return [];
  }

  return (data as NotificationLog[]) || [];
}

// Get notification statistics
export async function getNotificationStats(): Promise<{
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('whatsapp_notifications')
    .select('status');

  if (error) {
    console.error('Failed to fetch notification stats:', error);
    return { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 };
  }

  const notifications = data || [];
  
  return {
    total: notifications.length,
    sent: notifications.filter((n: any) => n.status === 'sent').length,
    delivered: notifications.filter((n: any) => n.status === 'delivered').length,
    failed: notifications.filter((n: any) => n.status === 'failed').length,
    pending: notifications.filter((n: any) => n.status === 'pending').length,
  };
}

// Retry a failed notification
export async function retryNotification(notificationId: string): Promise<NotificationResult> {
  const supabase = await createClient();
  
  // Get the original notification log
  const { data: notification, error } = await supabase
    .from('whatsapp_notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (error || !notification) {
    return { success: false, error: 'Notification not found' };
  }

  // Check if it's a failed notification
  if (notification.status !== 'failed') {
    return { success: false, error: 'Only failed notifications can be retried' };
  }

  // Retry based on notification type
  let result: NotificationResult;
  
  switch (notification.notification_type) {
    case 'PAYMENT_PENDING_APPROVAL':
      // This would need to be implemented with proper data fetching
      result = { success: false, error: 'Retry for pending approval not implemented' };
      break;
    case 'PAYMENT_APPROVED':
      result = { success: false, error: 'Retry for approved not implemented' };
      break;
    case 'PAYMENT_REJECTED':
      result = { success: false, error: 'Retry for rejected not implemented' };
      break;
    default:
      result = { success: false, error: 'Unknown notification type' };
  }

  // Update the notification log
  await supabase
    .from('whatsapp_notifications')
    .update({
      status: result.success ? 'sent' : 'failed',
      provider_message_id: result.messageId,
      sent_at: result.success ? new Date().toISOString() : null,
      failure_reason: result.error,
      retry_count: notification.retry_count + 1,
    })
    .eq('id', notificationId);

  return result;
}

// Get recent notification logs for admin view
export async function getRecentNotificationLogs(limit = 20): Promise<NotificationLog[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('whatsapp_notifications')
    .select(`
      *,
      student:students(first_name, last_name, student_number),
      payment:fee_payments(amount, receipt_number)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch recent notification logs:', error);
    return [];
  }

  return (data as NotificationLog[]) || [];
}