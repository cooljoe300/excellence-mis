'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setAdmissionNumberFormat } from '@/app/actions/system-settings';

export function AdmissionFormatCard({ initialFormat }: { initialFormat: string }) {
  const [format, setFormat] = useState(initialFormat);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await setAdmissionNumberFormat(format);
    if (res?.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    setSuccess('Saved. New students will use the updated format.');
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admission Number Format</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-slate-600">
          Controls how new admission numbers are generated.
        </p>

        <Input
          label="Format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          placeholder="ADM-{YYYY}-{SEQ4}"
          required
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-semibold">Supported tokens</p>
          <ul className="mt-1 list-disc pl-4">
            <li>{`{YYYY}`} – full year (e.g. 2026)</li>
            <li>{`{YY}`} – short year (e.g. 26)</li>
            <li>{`{SEQ}`} – sequence number</li>
            <li>{`{SEQ4}`} – sequence padded to 4 digits</li>
          </ul>
          <p className="mt-2">
            Example: <span className="font-mono">EOC-{`{YY}`}-{`{SEQ4}`}</span> →{' '}
            <span className="font-mono">EOC-26-0001</span>
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

