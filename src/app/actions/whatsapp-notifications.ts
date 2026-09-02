'use server';

import { createClient } from '@/lib/supabase/server';
import { whatsappService, createWhatsAppService, NotificationResult, normalizePhoneNumber } from '@/lib/whatsapp-service';
import { getSystemSettings } from '@/app/actions/system-settings';

// Get WhatsApp service with credentials from settings
export async function getWhatsAppService() {
  const settings = await getSystemSettings();
  const credentials = {
    twilioAccountSid: settings.find((s: any) => s.key === 'whatsapp_twilio_account_sid')?.value,
    twilioAuthToken: settings.find((s: any) => s.key === 'whatsapp_twilio_auth_token')?.value,
    twilioWhatsappNumber: settings.find((s: any) => s.key === 'whatsapp_twilio_number')?.value,
    messagebirdApiKey: settings.find((s: any) => s.key === 'whatsapp_messagebird_api_key')?.value,
    metaAccessToken: settings.find((s: any) => s.key === 'whatsapp_meta_access_token')?.value,
    metaPhoneNumberId: settings.find((s: any) => s.key === 'whatsapp_meta_phone_number_id')?.value,
  };
  
  return createWhatsAppService(credentials);
}

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
  const service = await getWhatsAppService();
  
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

// Save WhatsApp settings to system_settings
export async function saveWhatsAppSettings(settings: {
  enabled: boolean;
  provider: string;
  financePhone: string;
  enablePending: boolean;
  enableApproved: boolean;
  enableRejected: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsappNumber?: string;
  messagebirdApiKey?: string;
  metaAccessToken?: string;
  metaPhoneNumberId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const settingsToSave = [
    { key: 'whatsapp_enabled', value: settings.enabled ? 'true' : 'false' },
    { key: 'whatsapp_provider', value: settings.provider },
    { key: 'whatsapp_finance_phone', value: settings.financePhone },
    { key: 'whatsapp_enable_payment_pending', value: settings.enablePending ? 'true' : 'false' },
    { key: 'whatsapp_enable_payment_approved', value: settings.enableApproved ? 'true' : 'false' },
    { key: 'whatsapp_enable_payment_rejected', value: settings.enableRejected ? 'true' : 'false' },
  ];

  // Add provider-specific credentials
  if (settings.twilioAccountSid) {
    settingsToSave.push({ key: 'whatsapp_twilio_account_sid', value: settings.twilioAccountSid });
  }
  if (settings.twilioAuthToken) {
    settingsToSave.push({ key: 'whatsapp_twilio_auth_token', value: settings.twilioAuthToken });
  }
  if (settings.twilioWhatsappNumber) {
    settingsToSave.push({ key: 'whatsapp_twilio_number', value: settings.twilioWhatsappNumber });
  }
  if (settings.messagebirdApiKey) {
    settingsToSave.push({ key: 'whatsapp_messagebird_api_key', value: settings.messagebirdApiKey });
  }
  if (settings.metaAccessToken) {
    settingsToSave.push({ key: 'whatsapp_meta_access_token', value: settings.metaAccessToken });
  }
  if (settings.metaPhoneNumberId) {
    settingsToSave.push({ key: 'whatsapp_meta_phone_number_id', value: settings.metaPhoneNumberId });
  }

  // Upsert each setting
  for (const setting of settingsToSave) {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
    
    if (error) {
      console.error('Failed to save WhatsApp setting:', setting.key, error);
      return { success: false, error: `Failed to save ${setting.key}` };
    }
  }

  return { success: true };
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