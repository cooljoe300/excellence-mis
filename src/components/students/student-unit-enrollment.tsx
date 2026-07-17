'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { enrollMyUnits, type UnitOption } from '@/app/actions/student-enrollment';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export function StudentUnitEnrollment({
  programName,
  units,
  enrolledUnitIds,
  termMissing,
}: {
  programName: string | null;
  units: UnitOption[];
  enrolledUnitIds: string[];
  termMissing?: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(enrolledUnitIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    selectedTotal: number;
    newUnitsFee: number;
    feePaymentId: string | null;
    units: { code: string; name: string; unit_fee: number }[];
  } | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedUnits = useMemo(
    () => units.filter((u) => selectedSet.has(u.id)),
    [units, selectedSet]
  );

  const totalAmount = useMemo(
    () => selectedUnits.reduce((sum, u) => sum + Number(u.unit_fee ?? 0), 0),
    [selectedUnits]
  );

  function toggleUnit(id: string, checked: boolean) {
    if (!checked && enrolledUnitIds.includes(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newUnitIds = selectedIds.filter((id) => !enrolledUnitIds.includes(id));
    if (newUnitIds.length === 0) {
      setError('Select at least one new unit to register.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await enrollMyUnits(selectedIds);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    const newUnitsFee = response.newUnitsFee ?? 0;

    if (newUnitsFee > 0) {
      router.push('/student/fees?from=enrollment');
      return;
    }

    setResult({
      selectedTotal: response.selectedTotal ?? 0,
      newUnitsFee,
      feePaymentId: response.feePaymentId ?? null,
      units: response.units ?? [],
    });
    setLoading(false);
    router.refresh();
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-semibold">Units registered successfully</p>
          </div>
          <p className="mt-2 text-sm text-emerald-700">Your unit selection has been updated.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registration summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {result.units.map((u) => (
              <div key={u.code} className="flex justify-between gap-4">
                <span className="text-slate-700">
                  {u.code} — {u.name}
                </span>
                <span className="font-medium text-slate-900">{formatCurrency(u.unit_fee)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-3 flex justify-between gap-4 text-base font-bold">
              <span>Total</span>
              <span className="text-blue-700">{formatCurrency(result.selectedTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => router.push('/student')}>
            Back to portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-blue-700" />
            {programName ?? 'Your program'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {termMissing ? (
            <p className="text-sm text-amber-700">No current academic term is configured.</p>
          ) : units.length === 0 ? (
            <p className="text-sm text-slate-600">No units are available for your program yet.</p>
          ) : (
            <div className="space-y-1">
              <p className="mb-3 text-xs text-slate-600">
                Tick units to register. Each unit has its own fee. To remove a registered unit, submit a{' '}
                <Link href="/student/deregister" className="font-medium text-blue-700 hover:underline">
                  deregistration request
                </Link>.
              </p>
              {units.map((unit) => {
                const checked = selectedSet.has(unit.id);
                const alreadyEnrolled = enrolledUnitIds.includes(unit.id);
                return (
                  <label
                    key={unit.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 ${
                      alreadyEnrolled
                        ? 'cursor-default bg-slate-50'
                        : 'cursor-pointer hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                        checked={checked}
                        disabled={alreadyEnrolled}
                        onChange={(e) => toggleUnit(unit.id, e.target.checked)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 leading-tight">
                          {unit.code}
                          <span className="font-normal text-slate-500"> — {unit.name}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">{unit.credits} credits</p>
                        {alreadyEnrolled && (
                          <p className="text-[11px] text-emerald-600">
                            Registered —{' '}
                            <Link
                              href="/student/deregister"
                              className="font-medium text-blue-700 hover:underline"
                            >
                              deregister
                            </Link>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-900">
                      {formatCurrency(unit.unit_fee ?? 0)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {units.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-3">
            <div className="space-y-1">
              {selectedUnits.map((u) => (
                <div key={u.id} className="flex justify-between text-xs text-slate-700">
                  <span>{u.code}</span>
                  <span>{formatCurrency(u.unit_fee ?? 0)}</span>
                </div>
              ))}
              {selectedUnits.length === 0 && (
                <p className="text-xs text-slate-500">No units selected yet.</p>
              )}
              <div className="flex justify-between border-t border-blue-200 pt-2 text-sm font-bold text-slate-900">
                <span>Total</span>
                <span className="text-blue-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || units.length === 0 || termMissing}>
          {loading ? 'Registering...' : 'Register units'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/student')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
