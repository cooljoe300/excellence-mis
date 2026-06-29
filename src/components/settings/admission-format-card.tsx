'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_ADMISSION_NUMBER_FORMAT,
  setAdmissionNumberFormat,
} from '@/app/actions/system-settings';
import type { Program } from '@/lib/types';

function previewAdmissionNumber(format: string, code: string) {
  const year = new Date().getFullYear();
  const yy = String(year).slice(-2);
  return format
    .replaceAll('{YYYY}', String(year))
    .replaceAll('{YY}', yy)
    .replaceAll('{CODE}', code.toUpperCase())
    .replaceAll('{SEQ4}', '0001')
    .replaceAll('{SEQ3}', '001')
    .replaceAll('{SEQ}', '1');
}

export function AdmissionFormatCard({
  initialFormat,
  programs,
}: {
  initialFormat: string;
  programs: Program[];
}) {
  const [format, setFormat] = useState(initialFormat);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const programPreviews = useMemo(() => {
    return programs.map((program) => {
      const code = (program.admission_prefix || program.code).toUpperCase();
      return {
        id: program.id,
        name: program.name,
        code,
        example: previewAdmissionNumber(format, code),
      };
    });
  }, [programs, format]);

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
    setSuccess('Saved. New students will use the updated format for their program.');
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admission Number Format</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-slate-600">
          Admission numbers are generated per program when a student registers. The program&apos;s{' '}
          <strong>admission prefix</strong> (set under Programs) replaces {'{CODE}'} in the
          template.
        </p>

        <Input
          label="Format template"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          placeholder={DEFAULT_ADMISSION_NUMBER_FORMAT}
          required
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-semibold">Supported tokens</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>{`{CODE}`} – program admission prefix (e.g. CIFA, CPAF, CPAI)</li>
            <li>{`{YY}`} – short year (e.g. 26)</li>
            <li>{`{YYYY}`} – full year (e.g. 2026)</li>
            <li>{`{SEQ3}`} – sequence padded to 3 digits (001, 002…)</li>
            <li>{`{SEQ4}`} – sequence padded to 4 digits</li>
            <li>{`{SEQ}`} – sequence without padding</li>
          </ul>
          <p className="mt-2">
            Default:{' '}
            <span className="font-mono">{DEFAULT_ADMISSION_NUMBER_FORMAT}</span> →{' '}
            <span className="font-mono">EOC/CIFA/001/26</span>
          </p>
        </div>

        {programPreviews.length > 0 && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs">
            <p className="font-semibold text-blue-900">Preview by program</p>
            <p className="mt-1 text-blue-800">
              Edit admission prefixes under <strong>Programs</strong>. Sequence numbers are assigned
              separately per prefix and year.
            </p>
            <ul className="mt-2 space-y-1">
              {programPreviews.map((row) => (
                <li key={row.id} className="flex flex-wrap justify-between gap-2 text-blue-900">
                  <span>
                    {row.name} <span className="text-blue-700">({row.code})</span>
                  </span>
                  <span className="font-mono font-medium">{row.example}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save format'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
