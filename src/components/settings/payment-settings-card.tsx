'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setPaymentSettings, type PaymentSettings } from '@/app/actions/system-settings';

export function PaymentSettingsCard({ initialSettings }: { initialSettings: PaymentSettings }) {
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
        <CardTitle>Payment Details (Paybill & Bank)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-slate-600">
          Shown to students when they pay fees via M-Pesa or bank transfer.
        </p>

        <Input
          label="M-Pesa paybill number"
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
          label="Bank branch"
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
