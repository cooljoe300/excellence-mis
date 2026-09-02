// WhatsApp Notification Service
// Abstracts WhatsApp Business API integration for payment notifications

export interface WhatsAppNotification {
  recipientPhone: string;
  templateName: string;
  templateData: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
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

// Normalize Kenyan phone numbers to WhatsApp format
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('0')) {
    // Convert 0712345678 to 254712345678
    return '254' + cleaned.substring(1);
  }
  
  if (cleaned.startsWith('254')) {
    // Already in correct format
    return cleaned;
  }
  
  if (cleaned.startsWith('+254')) {
    // Remove the + sign
    return cleaned.substring(1);
  }
  
  // Assume it's already correct or handle as needed
  return cleaned;
}

// Generate formatted Kenyan phone number for display
export function formatPhoneNumberForDisplay(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizePhoneNumber(phone);
  if (normalized.startsWith('254') && normalized.length === 12) {
    return `+${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6, 9)} ${normalized.substring(9)}`;
  }
  
  return phone;
}

// WhatsApp Service Abstraction
class WhatsAppService {
  private provider: string;
  private isDevelopment: boolean;
  private testPhoneNumber?: string;
  private credentials: {
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioWhatsappNumber?: string;
    messagebirdApiKey?: string;
    metaAccessToken?: string;
    metaPhoneNumberId?: string;
  };

  constructor(credentials?: {
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioWhatsappNumber?: string;
    messagebirdApiKey?: string;
    metaAccessToken?: string;
    metaPhoneNumberId?: string;
  }) {
    this.provider = process.env.WHATSAPP_PROVIDER || 'twilio';
    this.isDevelopment = process.env.WHATSAPP_MODE === 'development';
    this.testPhoneNumber = process.env.WHATSAPP_TEST_PHONE;
    this.credentials = credentials || {};
  }

  // Send payment pending approval notification to Finance
  async sendPaymentPendingNotification(notification: WhatsAppNotification): Promise<NotificationResult> {
    const templateData = {
      student_name: notification.templateData.student_name,
      admission_number: notification.templateData.admission_number,
      amount: notification.templateData.amount,
      payment_method: notification.templateData.payment_method,
      reference_number: notification.templateData.reference_number,
      date: notification.templateData.date,
      review_link: notification.templateData.review_link,
    };

    const message = this.formatPendingApprovalMessage(templateData);
    return this.sendMessage(notification.recipientPhone, message, 'PAYMENT_PENDING_APPROVAL');
  }

  // Send payment approved notification to student
  async sendPaymentApprovedNotification(notification: WhatsAppNotification): Promise<NotificationResult> {
    const templateData = {
      student_name: notification.templateData.student_name,
      admission_number: notification.templateData.admission_number,
      amount: notification.templateData.amount,
      payment_method: notification.templateData.payment_method,
      reference_number: notification.templateData.reference_number,
      receipt_number: notification.templateData.receipt_number,
      date: notification.templateData.date,
    };

    const message = this.formatApprovedMessage(templateData);
    return this.sendMessage(notification.recipientPhone, message, 'PAYMENT_APPROVED');
  }

  // Send payment rejected notification to student
  async sendPaymentRejectedNotification(notification: WhatsAppNotification): Promise<NotificationResult> {
    const templateData = {
      student_name: notification.templateData.student_name,
      admission_number: notification.templateData.admission_number,
      amount: notification.templateData.amount,
      reference_number: notification.templateData.reference_number,
      rejection_reason: notification.templateData.rejection_reason,
    };

    const message = this.formatRejectedMessage(templateData);
    return this.sendMessage(notification.recipientPhone, message, 'PAYMENT_REJECTED');
  }

  // Format pending approval message
  private formatPendingApprovalMessage(data: Record<string, string>): string {
    return `*EXCELLENCE ONLINE COLLEGE*

🔔 *Payment Approval Required*

A new student payment requires approval.

Student: ${data.student_name}
Admission No: ${data.admission_number}
Amount: ${data.amount}
Payment Method: ${data.payment_method}
Reference: ${data.reference_number}
Date: ${data.date}

Status: *Pending Approval*

Please log in to the Finance Portal to review and approve/reject this payment.

${data.review_link}`;
  }

  // Format approved message
  private formatApprovedMessage(data: Record<string, string>): string {
    return `*EXCELLENCE ONLINE COLLEGE*

✅ *Payment Approved*

Dear ${data.student_name},

Your payment has been successfully approved.

Admission No: ${data.admission_number}
Amount: ${data.amount}
Payment Method: ${data.payment_method}
Reference: ${data.reference_number}
Status: *PAID*

Receipt No: ${data.receipt_number}

Thank you for your payment.

Excellence Online College`;
  }

  // Format rejected message
  private formatRejectedMessage(data: Record<string, string>): string {
    return `*EXCELLENCE ONLINE COLLEGE*

❌ *Payment Requires Attention*

Dear ${data.student_name},

Your payment submission requires attention.

Amount: ${data.amount}
Reference: ${data.reference_number}
Status: *Rejected*

Reason:
${data.rejection_reason}

Please contact the Finance Office or submit the correct payment information.

Excellence Online College`;
  }

  // Send message via appropriate provider
  private async sendMessage(
    recipientPhone: string,
    message: string,
    notificationType: string
  ): Promise<NotificationResult> {
    try {
      // In development mode, log instead of sending
      if (this.isDevelopment) {
        const targetPhone = this.testPhoneNumber || recipientPhone;
        console.log(`[WhatsApp Service - Development Mode]`);
        console.log(`[Notification Type: ${notificationType}]`);
        console.log(`[Target Phone: ${targetPhone}]`);
        console.log(`[Message]: ${message}`);
        
        return {
          success: true,
          messageId: `dev-${Date.now()}`,
        };
      }

      // Normalize phone number
      const normalizedPhone = normalizePhoneNumber(recipientPhone);
      
      // Send via configured provider
      switch (this.provider) {
        case 'twilio':
          return this.sendViaTwilio(normalizedPhone, message);
        case 'messagebird':
          return this.sendViaMessageBird(normalizedPhone, message);
        case 'meta':
          return this.sendViaMeta(normalizedPhone, message);
        default:
          return this.sendViaTwilio(normalizedPhone, message);
      }
    } catch (error) {
      console.error('WhatsApp notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send via Twilio
  private async sendViaTwilio(phone: string, message: string): Promise<NotificationResult> {
    const accountSid = this.credentials.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = this.credentials.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = this.credentials.twilioWhatsappNumber || process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !whatsappNumber) {
      return {
        success: false,
        error: 'Twilio credentials not configured',
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('From', `whatsapp:${whatsappNumber}`);
      params.append('To', `whatsapp:${phone}`);
      params.append('Body', message);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          },
          body: params.toString(),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          messageId: data.sid,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Twilio API error',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twilio connection error',
      };
    }
  }

  // Send via MessageBird
  private async sendViaMessageBird(phone: string, message: string): Promise<NotificationResult> {
    const apiKey = this.credentials.messagebirdApiKey || process.env.MESSAGEBIRD_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        error: 'MessageBird credentials not configured',
      };
    }

    try {
      const response = await fetch('https://rest.messagebird.com/messages', {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originator: 'Excellence College',
          recipients: [phone],
          body: message,
          channels: ['whatsapp'],
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.items && data.items.length > 0) {
        return {
          success: true,
          messageId: data.items[0].id,
        };
      } else {
        return {
          success: false,
          error: data.errors?.[0]?.description || 'MessageBird API error',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MessageBird connection error',
      };
    }
  }

  // Send via Meta (WhatsApp Business API)
  private async sendViaMeta(phone: string, message: string): Promise<NotificationResult> {
    const accessToken = this.credentials.metaAccessToken || process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = this.credentials.metaPhoneNumberId || process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      return {
        success: false,
        error: 'Meta WhatsApp credentials not configured',
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            text: { body: message },
          }),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          messageId: data.messages?.[0]?.id,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Meta WhatsApp API error',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Meta WhatsApp connection error',
      };
    }
  }

  // Check if WhatsApp is configured
  isConfigured(): boolean {
    if (this.isDevelopment) return true;
    
    switch (this.provider) {
      case 'twilio':
        return !!((this.credentials.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID) && 
                 (this.credentials.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN) && 
                 (this.credentials.twilioWhatsappNumber || process.env.TWILIO_WHATSAPP_NUMBER));
      case 'messagebird':
        return !!(this.credentials.messagebirdApiKey || process.env.MESSAGEBIRD_API_KEY);
      case 'meta':
        return !!((this.credentials.metaAccessToken || process.env.META_WHATSAPP_ACCESS_TOKEN) && 
                 (this.credentials.metaPhoneNumberId || process.env.META_WHATSAPP_PHONE_NUMBER_ID));
      default:
        return false;
    }
  }
}

// Export singleton instance (uses environment variables)
export const whatsappService = new WhatsAppService();

// Factory function to create service with credentials from settings
export function createWhatsAppService(credentials: {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsappNumber?: string;
  messagebirdApiKey?: string;
  metaAccessToken?: string;
  metaPhoneNumberId?: string;
}): WhatsAppService {
  return new WhatsAppService(credentials);
}