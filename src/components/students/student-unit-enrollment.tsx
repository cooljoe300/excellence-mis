'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError('Select at least one unit to register.');
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

    setResult({
      selectedTotal: response.selectedTotal ?? 0,
      newUnitsFee: response.newUnitsFee ?? 0,
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
          <p className="mt-2 text-sm text-emerald-700">
            {result.newUnitsFee > 0
              ? 'A fee invoice has been created for your newly added units.'
              : 'Your unit selection has been updated.'}
          </p>
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
            {result.newUnitsFee > 0 && (
              <p className="text-xs text-slate-500">
                Amount due for new units this session: {formatCurrency(result.newUnitsFee)}
              </p>
            )}
          </CardContent>
        </Card>

        <Button onClick={() => router.push('/student')}>Back to portal</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-700" />
            {programName ?? 'Your program'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {termMissing ? (
            <p className="text-sm text-amber-700">No current academic term is configured.</p>
          ) : units.length === 0 ? (
            <p className="text-sm text-slate-600">No units are available for your program yet.</p>
          ) : (
            <div className="space-y-2">
              <p className="mb-4 text-sm text-slate-600">
                Tick the units you want to register. Each unit has its own fee — your total is
                calculated automatically.
              </p>
              {units.map((unit) => {
                const checked = selectedSet.has(unit.id);
                const alreadyEnrolled = enrolledUnitIds.includes(unit.id);
                return (
                  <label
                    key={unit.id}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                        checked={checked}
                        onChange={(e) => toggleUnit(unit.id, e.target.checked)}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {unit.code}
                          <span className="font-normal text-slate-500"> — {unit.name}</span>
                        </p>
                        <p className="text-xs text-slate-500">{unit.credits} credits</p>
                        {alreadyEnrolled && checked && (
                          <p className="text-xs text-emerald-600">Already enrolled</p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">
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
          <CardContent className="py-5">
            <div className="space-y-2">
              {selectedUnits.map((u) => (
                <div key={u.id} className="flex justify-between text-sm text-slate-700">
                  <span>{u.code}</span>
                  <span>{formatCurrency(u.unit_fee ?? 0)}</span>
                </div>
              ))}
              {selectedUnits.length === 0 && (
                <p className="text-sm text-slate-500">No units selected yet.</p>
              )}
              <div className="flex justify-between border-t border-blue-200 pt-3 text-lg font-bold text-slate-900">
                <span>Total amount</span>
                <span className="text-blue-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || units.length === 0 || termMissing}>
          {loading ? 'Registering...' : 'Register selected units'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/student')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
