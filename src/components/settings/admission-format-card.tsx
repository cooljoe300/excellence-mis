'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setAdmissionNumberFormat } from '@/app/actions/system-settings';
import { DEFAULT_ADMISSION_NUMBER_FORMAT } from '@/lib/system-settings';
import type { Program } from '@/lib/types';

function previewAdmissionNumber(
  format: string,
  {
    code,
    academicYear,
    intake,
    studyMode,
    campus,
    sequence = 1,
  }: {
    code: string;
    academicYear?: string;
    intake?: string;
    studyMode?: string;
    campus?: string;
    sequence?: number;
  }
) {
  const year = new Date().getFullYear();
  const sequenceText = String(Math.max(sequence, 1));

  // Fill the flexible {SEQ:n} tokens first so they cannot be shadowed by {SEQ}.
  const withSequences = Array.from({ length: 10 }, (_, index) => index + 1).reduce(
    (value, width) =>
      value.replaceAll(
        `{SEQ:${width}}`,
        sequenceText.padStart(width, '0')
      ),
    format
  );

  const valueOrPlaceholder = (value?: string) => {
    const trimmed = (value ?? '').trim();
    return trimmed.length > 0 ? trimmed : '…';
  };

  return withSequences
    .replaceAll('{YYYY}', String(year))
    .replaceAll('{YY}', String(year).slice(-2))
    .replaceAll('{AY}', valueOrPlaceholder(academicYear))
    .replaceAll('{INTAKE}', valueOrPlaceholder(intake))
    .replaceAll('{MODE}', valueOrPlaceholder(studyMode))
    .replaceAll('{CAMPUS}', valueOrPlaceholder(campus))
    .replaceAll('{CODE}', code.toUpperCase())
    .replaceAll('{SEQ4}', sequenceText.padStart(4, '0'))
    .replaceAll('{SEQ3}', sequenceText.padStart(3, '0'))
    .replaceAll('{SEQ}', sequenceText);
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
      const programFormat = program.admission_number_format?.trim() || format;
      return {
        id: program.id,
        name: program.name,
        code,
        example: previewAdmissionNumber(programFormat, {
          code,
          studyMode: program.study_modes?.[0],
          campus: program.campus ?? undefined,
          sequence: program.admission_sequence_start ?? 1,
        }),
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
          Admission numbers are generated per programme when a student registers or changes
          programme. This template applies to every programme that does not define its own format.
          The programme&apos;s <strong>admission prefix</strong> (set under Programmes) replaces{' '}
          {'{CODE}'} in the template.
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
            <li>{`{CODE}`} – programme admission prefix (from the programme configuration)</li>
            <li>{`{YY}`} – short year (e.g. 26)</li>
            <li>{`{YYYY}`} – full year (e.g. 2026)</li>
            <li>{`{AY}`} – academic year (e.g. 2026/2027)</li>
            <li>{`{INTAKE}`} – intake name (e.g. August2026)</li>
            <li>{`{MODE}`} – study mode selected for the enrollment</li>
            <li>{`{CAMPUS}`} – campus from the programme configuration</li>
            <li>{`{SEQ3}`} – sequence padded to 3 digits (001, 002…)</li>
            <li>{`{SEQ4}`} – sequence padded to 4 digits</li>
            <li>{`{SEQ}`} – sequence without padding</li>
            <li>{`{SEQ:n}`} – sequence padded to n digits (e.g. {`{SEQ:5}`} → 00001)</li>
          </ul>
          <p className="mt-2">
            Default:{' '}
            <span className="font-mono">{DEFAULT_ADMISSION_NUMBER_FORMAT}</span> →{' '}
            <span className="font-mono">
              {previewAdmissionNumber(DEFAULT_ADMISSION_NUMBER_FORMAT, { code: 'PRG' })}
            </span>{' '}
            <span className="text-slate-500">(example prefix: PRG)</span>
          </p>
          <p className="mt-2">
            A programme can override this template under <strong>Programmes</strong>. The format
            must always contain a sequence token so numbers stay unique.
          </p>
        </div>

        {programPreviews.length > 0 && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs">
            <p className="font-semibold text-blue-900">Preview by programme</p>
            <p className="mt-1 text-blue-800">
              Edit admission prefixes and per-programme formats under <strong>Programmes</strong>.
              Sequence numbers are assigned separately per prefix and year. Tokens without a value
              show as … until the student is enrolled.
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
