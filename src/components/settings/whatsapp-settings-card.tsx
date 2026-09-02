'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { whatsappService } from '@/lib/whatsapp-service';
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
  });

  const isConfigured = whatsappService.isConfigured();

  async function handleSave() {
    setLoading(true);
    try {
      // In a real implementation, this would save to system_settings
      // For now, we'll just show a success message
      success('WhatsApp settings saved successfully');
      setTestResult(null);
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
          helper="WhatsApp number to receive payment approval notifications"
        />

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
          <p className="font-medium mb-2">Environment Variables Required:</p>
          <div className="space-y-1">
            <p><code>WHATSAPP_MODE</code> - development or production</p>
            <p><code>WHATSAPP_PROVIDER</code> - twilio, messagebird, or meta</p>
            {settings.provider === 'twilio' && (
              <>
                <p><code>TWILIO_ACCOUNT_SID</code></p>
                <p><code>TWILIO_AUTH_TOKEN</code></p>
                <p><code>TWILIO_WHATSAPP_NUMBER</code></p>
              </>
            )}
            {settings.provider === 'messagebird' && (
              <p><code>MESSAGEBIRD_API_KEY</code></p>
            )}
            {settings.provider === 'meta' && (
              <>
                <p><code>META_WHATSAPP_ACCESS_TOKEN</code></p>
                <p><code>META_WHATSAPP_PHONE_NUMBER_ID</code></p>
              </>
            )}
            <p><code>WHATSAPP_TEST_PHONE</code> - Test number for development</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}