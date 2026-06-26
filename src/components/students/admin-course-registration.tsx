'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  getCurrentAcademicTermId,
  getProgramCourses,
  getStudentCourseIdsForTerm,
  setStudentEnrollmentsForTerm,
} from '@/app/actions/enrollments';
import type { Student } from '@/lib/types';
import { BookOpen } from 'lucide-react';

export function AdminCourseRegistration({ student }: { student: Student }) {
  const router = useRouter();
  const [termId, setTermId] = useState<string | null>(null);
  const [units, setUnits] = useState<
    { id: string; code: string; name: string; unit_fee: number; credits: number }[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedUnits = useMemo(
    () => units.filter((u) => selectedSet.has(u.id)),
    [units, selectedSet]
  );
  const totalAmount = useMemo(
    () => selectedUnits.reduce((sum, u) => sum + Number(u.unit_fee ?? 0), 0),
    [selectedUnits]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setInitialLoading(true);
      setError(null);

      const currentTermId = await getCurrentAcademicTermId();
      if (cancelled) return;

      setTermId(currentTermId);

      if (!student.program_id) {
        setUnits([]);
        setSelectedIds([]);
        setInitialLoading(false);
        return;
      }

      if (!currentTermId) {
        setInitialLoading(false);
        return;
      }

      try {
        const [programUnits, enrolled] = await Promise.all([
          getProgramCourses(student.program_id),
          getStudentCourseIdsForTerm(student.id, currentTermId),
        ]);
        if (cancelled) return;
        setUnits(programUnits);
        setSelectedIds(enrolled);
      } catch {
        if (!cancelled) setError('Failed to load courses.');
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [student.id, student.program_id]);

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
    if (!termId) {
      setError('No current academic term is set.');
      return;
    }
    if (selectedIds.length === 0) {
      setError('Select at least one unit.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await setStudentEnrollmentsForTerm(student.id, termId, selectedIds);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(
      result.feePaymentId
        ? 'Units registered and a fee invoice has been generated.'
        : 'Course registration updated successfully.'
    );
    setLoading(false);
    router.refresh();
  }

  if (!student.program_id) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Assign a programme on the Student Personal Profile tab before registering courses.
      </div>
    );
  }

  if (initialLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (!termId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No current academic term is configured. Set one under Academic Terms.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-700" />
            {(student.program as { name: string } | null)?.name ?? 'Programme units'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <p className="text-sm text-slate-600">No active units for this programme.</p>
          ) : (
            <div className="space-y-2">
              {units.map((unit) => (
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
                      <p className="text-xs text-slate-500">{unit.credits} credits</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(unit.unit_fee ?? 0)}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {units.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="flex items-center justify-between py-5">
            <span className="text-lg font-bold text-slate-900">Total</span>
            <span className="text-lg font-bold text-blue-700">{formatCurrency(totalAmount)}</span>
          </CardContent>
        </Card>
      )}

      <Button type="submit" disabled={loading || units.length === 0}>
        {loading ? 'Saving...' : 'Save course registration'}
      </Button>
    </form>
  );
}
