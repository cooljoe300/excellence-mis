'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { whatsappService } from '@/lib/whatsapp-service';
import { saveWhatsAppSettings } from '@/app/actions/whatsapp-notifications';
import { Bell, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';

interface WhatsAppSettingsCardProps {
  initialSettings?: {
    enabled: boolean;
    provider: string;
    financePhone: string;
    enablePending: boolean;
    enableApproved: boolean;
    enableRejected: boolean;
  };
}

export function WhatsAppSettingsCard({ initialSettings }: WhatsAppSettingsCardProps = {}) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [settings, setSettings] = useState({
    enabled: initialSettings?.enabled || false,
    provider: initialSettings?.provider || 'twilio',
    financePhone: initialSettings?.financePhone || '',
    enablePending: initialSettings?.enablePending ?? true,
    enableApproved: initialSettings?.enableApproved ?? true,
    enableRejected: initialSettings?.enableRejected ?? true,
    // Twilio credentials
    twilioAccountSid: initialSettings?.twilioAccountSid || '',
    twilioAuthToken: initialSettings?.twilioAuthToken || '',
    twilioWhatsappNumber: initialSettings?.twilioWhatsappNumber || '',
    // MessageBird credentials
    messagebirdApiKey: initialSettings?.messagebirdApiKey || '',
    // Meta credentials
    metaAccessToken: initialSettings?.metaAccessToken || '',
    metaPhoneNumberId: initialSettings?.metaPhoneNumberId || '',
  });

  const isConfigured = whatsappService.isConfigured();

  async function handleSave() {
    setLoading(true);
    try {
      const result = await saveWhatsAppSettings(settings);
      if (result.success) {
        success('WhatsApp settings saved successfully');
        setTestResult(null);
      } else {
        toastError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      toastError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleTestNotification() {
    setLoading(true);
    setTestResult(null);
    
    try {
      const result = await whatsappService.sendPaymentPendingNotification({
        recipientPhone: settings.financePhone || process.env.WHATSAPP_TEST_PHONE || '',
        templateName: 'test_notification',
        templateData: {
          student_name: 'Test Student',
          admission_number: 'TEST/2026/001',
          amount: 'KES 1,000',
          payment_method: 'Test',
          reference_number: 'TEST123',
          date: new Date().toLocaleDateString('en-GB'),
          review_link: 'https://test.com',
        },
      });

      setTestResult({
        success: result.success,
        message: result.success 
          ? 'Test notification sent successfully' 
          : `Failed: ${result.error}`,
      });

      if (result.success) {
        success('Test notification sent successfully');
      } else {
        toastError(result.error || 'Failed to send test notification');
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Failed to send test notification',
      });
      toastError('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          WhatsApp Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <XCircle className="h-4 w-4" />
              Not Configured
            </div>
          )}
        </div>

        <Select
          label="Status"
          value={settings.enabled ? 'true' : 'false'}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.value === 'true' })}
          options={[
            { value: 'true', label: 'Enabled' },
            { value: 'false', label: 'Disabled' },
          ]}
        />

        <Select
          label="WhatsApp Provider"
          value={settings.provider}
          onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
          options={[
            { value: 'twilio', label: 'Twilio' },
            { value: 'messagebird', label: 'MessageBird' },
            { value: 'meta', label: 'Meta (WhatsApp Business API)' },
          ]}
        />

        <Input
          label="Finance Notification Phone"
          value={settings.financePhone}
          onChange={(e) => setSettings({ ...settings, financePhone: e.target.value })}
          placeholder="254712345678"
        />
        <p className="text-xs text-slate-500">WhatsApp number to receive payment approval notifications</p>

        {settings.provider === 'twilio' && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-sm font-medium text-slate-700">Twilio Credentials</p>
            <Input
              label="Account SID"
              value={settings.twilioAccountSid}
              onChange={(e) => setSettings({ ...settings, twilioAccountSid: e.target.value })}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              type="password"
            />
            <Input
              label="Auth Token"
              value={settings.twilioAuthToken}
              onChange={(e) => setSettings({ ...settings, twilioAuthToken: e.target.value })}
              placeholder="Your Twilio Auth Token"
              type="password"
            />
            <Input
              label="WhatsApp Number"
              value={settings.twilioWhatsappNumber}
              onChange={(e) => setSettings({ ...settings, twilioWhatsappNumber: e.target.value })}
              placeholder="whatsapp:+14155238886"
            />
          </div>
        )}

        {settings.provider === 'messagebird' && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-sm font-medium text-slate-700">MessageBird Credentials</p>
            <Input
              label="API Key"
              value={settings.messagebirdApiKey}
              onChange={(e) => setSettings({ ...settings, messagebirdApiKey: e.target.value })}
              placeholder="Your MessageBird API Key"
              type="password"
            />
          </div>
        )}

        {settings.provider === 'meta' && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-sm font-medium text-slate-700">Meta WhatsApp Credentials</p>
            <Input
              label="Access Token"
              value={settings.metaAccessToken}
              onChange={(e) => setSettings({ ...settings, metaAccessToken: e.target.value })}
              placeholder="Your Meta WhatsApp Access Token"
              type="password"
            />
            <Input
              label="Phone Number ID"
              value={settings.metaPhoneNumberId}
              onChange={(e) => setSettings({ ...settings, metaPhoneNumberId: e.target.value })}
              placeholder="Your Phone Number ID"
            />
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Notification Types</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.enablePending}
                onChange={(e) => setSettings({ ...settings, enablePending: e.target.checked })}
                className="rounded"
              />
              <span>Payment pending approval (to Finance)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.enableApproved}
                onChange={(e) => setSettings({ ...settings, enableApproved: e.target.checked })}
                className="rounded"
              />
              <span>Payment approved (to Student)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.enableRejected}
                onChange={(e) => setSettings({ ...settings, enableRejected: e.target.checked })}
                className="rounded"
              />
              <span>Payment rejected (to Student)</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleTestNotification}
            disabled={loading || !settings.financePhone}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {loading ? 'Sending...' : 'Send Test WhatsApp'}
          </Button>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'success' : 'error'}>
            {testResult.message}
          </Alert>
        )}

        <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-medium mb-2">Configuration Notes:</p>
          <div className="space-y-1">
            <p>• Credentials are stored securely in the database</p>
            <p>• Use <code>WHATSAPP_MODE=development</code> environment variable to test without sending real messages</p>
            <p>• Set <code>WHATSAPP_TEST_PHONE</code> to override recipient in development mode</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}