'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/page-header';
import { formatCurrency } from '@/lib/utils';
import {
  getUnitRegistrationContext,
  saveUnitRegistration,
  searchStudentsForUnitRegistration,
  type UnitRegistrationContext,
} from '@/app/actions/unit-registration';
import {
  BookOpen,
  CheckCircle2,
  History,
  Info,
  Search,
  UserRound,
} from 'lucide-react';

interface StudentSearchRow {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  student_number: string;
  status: string;
  program_id: string | null;
  program?: { id: string; name: string; code: string } | null;
  curriculum?: { id: string; name: string; academic_year: string } | null;
}

export function UnitRegistrationClient({
  initialStudentId,
}: {
  initialStudentId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<StudentSearchRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId ?? '');
  const [context, setContext] = useState<UnitRegistrationContext | null>(null);
  const [contextLoading, setContextLoading] = useState(Boolean(initialStudentId));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [semester, setSemester] = useState<number | null>(null);
  const [termId, setTermId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  async function loadContext(
    studentId: string,
    options?: { semester?: number; termId?: string }
  ) {
    if (!studentId) {
      setContext(null);
      return;
    }

    setContextLoading(true);
    setError(null);

    const result = await getUnitRegistrationContext(studentId, options);

    if ('error' in result) {
      setContext(null);
      setError(result.error);
      setContextLoading(false);
      return;
    }

    setContext(result);
    setSelectedIds(result.selected_course_ids);
    setSemester(result.semester);
    setTermId(result.termId ?? '');
    setSelectedStudentId(studentId);
    setContextLoading(false);
  }

  useEffect(() => {
    if (initialStudentId) {
      void loadContext(initialStudentId);
    }
    void (async () => {
      setSearching(true);
      const response = await searchStudentsForUnitRegistration();
      if (!('error' in response)) setResults(response.students as StudentSearchRow[]);
      setSearching(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    const response = await searchStudentsForUnitRegistration(query);
    if ('error' in response) {
      setError(response.error);
    } else {
      setResults(response.students as StudentSearchRow[]);
    }
    setSearching(false);
  }

  function chooseStudent(studentId: string) {
    setResults([]);
    setSuccess(null);
    setInvoiceId(null);
    void loadContext(studentId);
  }

  function toggleUnit(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  }

  async function handleSemesterChange(value: string) {
    const next = Number(value);
    setSemester(next);
    setSelectedIds([]);
    setSuccess(null);
    if (context) {
      await loadContext(context.student.id, {
        semester: next,
        termId: termId || undefined,
      });
    }
  }

  async function handleTermChange(value: string) {
    setTermId(value);
    setSuccess(null);
    if (context) {
      await loadContext(context.student.id, {
        semester: semester ?? undefined,
        termId: value || undefined,
      });
    }
  }

  async function handleSave() {
    if (!context) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    setInvoiceId(null);

    const result = await saveUnitRegistration({
      studentId: context.student.id,
      termId: termId || context.termId || '',
      semester: semester ?? context.semester,
      courseIds: selectedIds,
    });

    setSaving(false);

    if ('error' in result) {
      setError(result.error ?? 'Unable to save unit registration.');
      return;
    }

    const unitsRemoved = result.unitsRemoved ?? 0;
    setSuccess(
      result.feePaymentId
        ? 'Unit registration saved and a fee invoice has been generated.'
        : unitsRemoved > 0
          ? `Unit registration saved. ${unitsRemoved} unit${unitsRemoved === 1 ? '' : 's'} deregistered and related fee invoices updated.`
          : selectedIds.length === 0
            ? 'All units for this semester were deregistered.'
            : 'Unit registration saved.'
    );
    setInvoiceId(result.feePaymentId ?? null);

    await loadContext(context.student.id, {
      semester: semester ?? undefined,
      termId: termId || undefined,
    });
    router.refresh();
  }

  const selectedUnits = (context?.units ?? []).filter((unit) =>
    selectedIds.includes(unit.id)
  );
  const selectedTotal = selectedUnits.reduce(
    (sum, unit) => sum + Number(unit.unit_fee ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-700" />
            Select student
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, admission number, student number or email"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </form>

          {results.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Student</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Admission #</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Programme</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Curriculum</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((row) => (
                      <tr
                        key={row.id}
                        className={row.id === selectedStudentId ? 'bg-blue-50/60' : 'hover:bg-slate-50'}
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">
                            {row.first_name} {row.last_name}
                          </p>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {row.admission_number ?? row.student_number}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.program ? `${row.program.code} — ${row.program.name}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.curriculum?.name ?? 'Not pinned'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge status={row.status}>{row.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={row.id === selectedStudentId ? 'primary' : 'secondary'}
                            onClick={() => chooseStudent(row.id)}
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {contextLoading && <div className="h-24 animate-pulse rounded-xl bg-slate-100" />}

          {error && !context && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {context && !contextLoading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {context.student.first_name} {context.student.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Admission #:{' '}
                      <span className="font-mono">
                        {context.student.admission_number ?? context.student.student_number}
                      </span>
                      {' · '}Student ID:{' '}
                      <span className="font-mono">{context.student.id.slice(0, 8)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={context.student.status}>{context.student.status}</Badge>
                  <Link
                    href={`/dashboard/students/${context.student.id}`}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Open profile →
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Detail
                  label="Programme"
                  value={
                    context.student.program_name
                      ? `${context.student.program_code ?? ''} — ${context.student.program_name}`
                      : 'Not assigned'
                  }
                />
                <Detail label="Curriculum" value={context.curriculum.name} />
                <Detail label="Academic year" value={context.student.academic_year ?? 'Not set'} />
                <Detail label="Study mode" value={context.student.study_mode ?? 'Not set'} />
                <Detail label="Intake" value={context.student.intake_name ?? 'Not set'} />
                <Detail
                  label="Current semester"
                  value={`Semester ${context.student.current_semester}`}
                />
                <Detail label="Units in curriculum" value={`${context.units.length} in semester ${context.semester}`} />
                <Detail label="Academic term" value={context.term?.name ?? 'No current term'} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {context && !contextLoading && (
        <>
          {context.notice && (
            <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{context.notice}</p>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </p>
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

          {error && context && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-700" />
                {context.curriculum.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                    onChange={handleSemesterChange}
                  />
                </div>
                <div>
                  <label htmlFor="term" className="block text-sm font-medium text-slate-700">
                    Academic term
                  </label>
                  <Select
                    id="term"
                    value={termId}
                    options={[
                      { value: '', label: 'Select academic term' },
                      ...context.terms.map((term) => ({
                        value: term.id,
                        label: `${term.name}${term.is_current ? ' (current)' : ''}`,
                      })),
                    ]}
                    onChange={handleTermChange}
                  />
                </div>
              </div>

              {context.units.length === 0 ? (
                <EmptyState
                  title={`No units in semester ${context.semester}`}
                  description="Add units to this curriculum semester under Curricula before registering the student."
                  icon={BookOpen}
                />
              ) : (
                <div className="space-y-2">
                  {context.units.map((unit) => {
                    const checked = selectedIds.includes(unit.id);
                    const wasDeregistered = context.deregistered_course_ids.includes(unit.id);
                    return (
                      <label
                        key={unit.id}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-blue-200"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
                            checked={checked}
                            onChange={(e) => toggleUnit(unit.id, e.target.checked)}
                          />
                          <div>
                            <p className="font-medium text-slate-900">
                              {unit.code} — {unit.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {unit.credits} credits · Semester {unit.semester}
                              {checked && !wasDeregistered && (
                                <span className="ml-2 font-medium text-emerald-700">
                                  registered
                                </span>
                              )}
                              {wasDeregistered && (
                                <span className="ml-2 font-medium text-amber-700">
                                  previously deregistered
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(unit.unit_fee ?? 0)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedIds.length} unit{selectedIds.length === 1 ? '' : 's'} selected
                  </p>
                  <p className="text-xs text-slate-500">
                    Total unit fees: {formatCurrency(selectedTotal)}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !termId || context.units.length === 0}
                >
                  {saving ? 'Saving…' : 'Save unit registration'}
                </Button>
              </div>
              {!termId && (
                <p className="text-xs text-amber-700">
                  Select an academic term before saving.
                </p>
              )}
            </CardContent>
          </Card>

          {context.other_semester_units.length > 0 && (
            <UnitListCard
              title="Other semesters in this curriculum"
              description="These units belong to the same curriculum but a different semester. They are preserved and can be managed by selecting that semester above."
              units={context.other_semester_units}
            />
          )}

          {context.preserved_units.length > 0 && (
            <UnitListCard
              title="Preserved units from a previous programme"
              description="These units are kept for academic records after a programme change. They are not part of the current curriculum."
              units={context.preserved_units}
            />
          )}
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

function UnitListCard({
  title,
  description,
  units,
}: {
  title: string;
  description: string;
  units: UnitRegistrationContext['preserved_units'];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4 text-amber-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="mb-2 text-xs text-slate-500">{description}</p>
        {units.map((unit) => (
          <div
            key={unit.enrollment_id}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">
                {unit.code} — {unit.name}
              </p>
              <p className="text-xs text-slate-500">
                {unit.credits} credits
                {unit.semester ? ` · Semester ${unit.semester}` : ''} · {unit.status}
              </p>
            </div>
            <span className="text-sm text-slate-600">{formatCurrency(unit.unit_fee ?? 0)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
