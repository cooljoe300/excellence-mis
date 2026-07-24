'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setPaymentSettings } from '@/app/actions/system-settings';
import type { PaymentSettings } from '@/lib/system-settings';

// Pesapal temporarily disabled from frontend - do not delete backend integration
// Re-enable when Pesapal payment integration is ready
const ENABLE_PESAPAL = false;

export function PaymentSettingsCard({
  initialSettings,
  pesapalConfigured,
  pesapalMissingConfig = [],
}: {
  initialSettings: PaymentSettings;
  pesapalConfigured: boolean;
  pesapalMissingConfig?: string[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await setPaymentSettings(settings);
    if (res?.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    setSuccess('Payment details saved. Students will see these on the Pay Fees page.');
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-slate-600">
          Manual paybill/bank instructions for students.
        </p>

        {ENABLE_PESAPAL && (
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.pesapalEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, pesapalEnabled: e.target.checked }))}
            />
            <span>
              <span className="font-medium text-slate-900">Enable PesaPal online payments</span>
              <span className="mt-1 block text-slate-600">
                Students pay via PesaPal (M-Pesa, card, etc.) and are redirected back after payment.
                Requires PesaPal credentials in server environment variables.
              </span>
              <span
                className={`mt-2 inline-block text-xs font-medium ${
                  pesapalConfigured ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {pesapalConfigured
                  ? 'PesaPal credentials detected on server.'
                  : `Missing on server: ${pesapalMissingConfig.join(', ') || 'PESAPAL_* env vars'}`}
              </span>
            </span>
          </label>
        )}

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.mpesaStkEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, mpesaStkEnabled: e.target.checked }))}
          />
          <span>
            <span className="font-medium text-slate-900">Enable M-Pesa STK Push</span>
            <span className="mt-1 block text-slate-600">
              Students can enter their phone number and receive an M-Pesa prompt directly on their
              handset. Requires Safaricom STK credentials in server environment variables.
            </span>
          </span>
        </label>

        <Input
          label="M-Pesa paybill number (manual payments)"
          value={settings.mpesaPaybill}
          onChange={(e) => setSettings((s) => ({ ...s, mpesaPaybill: e.target.value }))}
          required
        />
        <Input
          label="M-Pesa account instructions"
          value={settings.mpesaAccountLabel}
          onChange={(e) => setSettings((s) => ({ ...s, mpesaAccountLabel: e.target.value }))}
        />

        <Input
          label="Bank name"
          value={settings.bankName}
          onChange={(e) => setSettings((s) => ({ ...s, bankName: e.target.value }))}
        />
        <Input
          label="Bank account number"
          value={settings.bankAccount}
          onChange={(e) => setSettings((s) => ({ ...s, bankAccount: e.target.value }))}
        />
        <Input
          label="Bank account name"
          value={settings.bankBranch}
          onChange={(e) => setSettings((s) => ({ ...s, bankBranch: e.target.value }))}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save payment details'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
