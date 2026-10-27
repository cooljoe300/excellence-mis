'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Select from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import {
  getUnitRegistrationContext,
  saveUnitRegistration,
  type UnitRegistrationContext,
} from '@/app/actions/unit-registration';
import type { Student } from '@/lib/types';
import { BookOpen, History } from 'lucide-react';

export function AdminCourseRegistration({ student }: { student: Student }) {
  const router = useRouter();
  const [context, setContext] = useState<UnitRegistrationContext | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedUnits = useMemo(
    () => (context?.units ?? []).filter((u) => selectedSet.has(u.id)),
    [context, selectedSet]
  );
  const totalAmount = useMemo(
    () => selectedUnits.reduce((sum, u) => sum + Number(u.unit_fee ?? 0), 0),
    [selectedUnits]
  );

  async function load(nextSemester?: number) {
    setInitialLoading(true);
    setError(null);

    const result = await getUnitRegistrationContext(student.id, {
      semester: nextSemester,
    });

    if ('error' in result) {
      setContext(null);
      setError(result.error);
      setInitialLoading(false);
      return;
    }

    setContext(result);
    setSemester(result.semester);
    setSelectedIds(result.selected_course_ids);
    setInitialLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  function toggleUnit(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!context || !semester) {
      setError('Select a semester.');
      return;
    }
    if (!context.termId) {
      setError('No current academic term is set.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await saveUnitRegistration({
      studentId: student.id,
      termId: context.termId,
      semester,
      courseIds: selectedIds,
    });

    if ('error' in result) {
      setError(result.error ?? 'Unable to save unit registration.');
      setLoading(false);
      return;
    }

    const unitsRemoved = result.unitsRemoved ?? 0;
    setSuccess(
      result.feePaymentId
        ? 'Units registered and a fee invoice has been generated.'
        : unitsRemoved > 0
          ? `Deregistered ${unitsRemoved} unit${unitsRemoved === 1 ? '' : 's'}. Related fee invoices were updated and pending payments were cancelled.`
          : selectedIds.length === 0
            ? 'All units deregistered for this semester. Outstanding fee balances were waived where applicable.'
            : 'Unit registration updated successfully.'
    );
    setInvoiceId(result.feePaymentId ?? null);
    setLoading(false);
    router.refresh();
  }

  if (!student.program_id) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Assign a programme on the Student Personal Profile tab before registering units. Programme
        changes must go through Programme Enrollment.
      </div>
    );
  }

  if (initialLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (!context) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {error ?? 'Unable to load the student curriculum.'}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>{success}</p>
          {invoiceId && (
            <Link
              href={`/dashboard/fees/invoice/${invoiceId}`}
              target="_blank"
              className="mt-2 inline-block font-medium text-blue-700 hover:underline"
            >
              Download invoice →
            </Link>
          )}
        </div>
      )}

      {!context.termId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No current academic term is configured. Set one under Academic Terms.
        </div>
      )}
      {context.notice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
          {context.notice}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-700" />
            {(context.student.program_name ?? 'Programme units')}
            <span className="text-sm font-normal text-slate-500">
              · {context.curriculum.name}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-slate-700">
                Semester
              </label>
              <Select
                id="semester"
                value={String(semester ?? '')}
                options={context.semesters.map((value) => ({
                  value: String(value),
                  label: `Semester ${value}`,
                }))}
                onChange={(value) => {
                  const next = Number(value);
                  setSemester(next);
                  setSelectedIds([]);
                  setSuccess(null);
                  void load(next);
                }}
              />
            </div>
            <div className="text-xs text-slate-500 sm:pt-6">
              Units are loaded from the student&apos;s curriculum for the selected semester.
            </div>
          </div>

          {context.units.length === 0 ? (
            <p className="text-sm text-slate-600">
              No active units are configured for semester {semester} in this curriculum.
            </p>
          ) : (
            <div className="space-y-2">
              {context.units.map((unit) => (
                <label
                  key={unit.id}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-blue-200"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
                      checked={selectedSet.has(unit.id)}
                      onChange={(e) => toggleUnit(unit.id, e.target.checked)}
                    />
                    <div>
                      <p className="font-medium text-slate-900">
                        {unit.code} — {unit.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {unit.credits} credits · Semester {unit.semester}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(unit.unit_fee ?? 0)}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {context.preserved_units.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4 text-amber-600" />
              Preserved units from a previous programme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {context.preserved_units.map((unit) => (
              <div
                key={unit.enrollment_id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {unit.code} — {unit.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {unit.credits} credits · {unit.status}
                  </p>
                </div>
                <span className="text-sm text-slate-600">{formatCurrency(unit.unit_fee ?? 0)}</span>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Historical units are retained for academic records and are not part of the current
              curriculum semester.
            </p>
          </CardContent>
        </Card>
      )}

      {context.units.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="flex items-center justify-between py-5">
            <span className="text-lg font-bold text-slate-900">Total</span>
            <span className="text-lg font-bold text-blue-700">{formatCurrency(totalAmount)}</span>
          </CardContent>
        </Card>
      )}

      <Button type="submit" disabled={loading || context.units.length === 0 || !context.termId}>
        {loading
          ? 'Saving...'
          : selectedIds.length === 0
            ? 'Deregister all units in this semester'
            : 'Save unit registration'}
      </Button>
    </form>
  );
}
