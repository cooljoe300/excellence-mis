'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/page-header';
import { formatDate } from '@/lib/utils';
import {
  changeStudentProgramme,
  getProgrammeChangeHistory,
  getProgrammeEnrollmentContext,
  previewProgrammeChange,
  searchStudentsForEnrollment,
  type ProgrammeEnrollmentContext,
  type ProgrammeEnrollmentSearchRow,
} from '@/app/actions/programme-enrollment';
import type { ProgrammeChangeHistory, ProgrammeChangePreview } from '@/lib/types';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  GraduationCap,
  History,
  Search,
  UserRound,
} from 'lucide-react';

export function ProgrammeEnrollmentClient({
  initialStudentId,
}: {
  initialStudentId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProgrammeEnrollmentSearchRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId ?? '');
  const [context, setContext] = useState<ProgrammeEnrollmentContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [newProgramId, setNewProgramId] = useState('');
  const [newIntakeId, setNewIntakeId] = useState('');
  const [newStudyMode, setNewStudyMode] = useState('');
  const [newCurriculumId, setNewCurriculumId] = useState('');
  const [newSemester, setNewSemester] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [preview, setPreview] = useState<ProgrammeChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [history, setHistory] = useState<
    (ProgrammeChangeHistory & {
      student?: {
        id: string;
        first_name: string;
        last_name: string;
        admission_number: string | null;
        student_number: string;
      } | null;
    })[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const student = context?.student ?? null;
  const programmes = useMemo(() => context?.programmes ?? [], [context]);
  const selectedOption = useMemo(
    () => programmes.find((option) => option.program.id === newProgramId) ?? null,
    [programmes, newProgramId]
  );

  const availableCurricula = useMemo(
    () => selectedOption?.curricula ?? [],
    [selectedOption]
  );
  const selectedCurriculum = useMemo(
    () =>
      availableCurricula.find((curriculum) => curriculum.id === newCurriculumId) ??
      selectedOption?.default_curriculum ??
      null,
    [availableCurricula, newCurriculumId, selectedOption]
  );
  const availableSemesters = selectedCurriculum?.semesters ?? selectedOption?.semesters ?? [];
  const studyModes = selectedOption?.program.study_modes ?? [];

  const loadHistory = useCallback(async (studentId?: string) => {
    setHistoryLoading(true);
    const result = await getProgrammeChangeHistory(studentId || undefined);
    if (!('error' in result)) {
      setHistory(result.history as typeof history);
    }
    setHistoryLoading(false);
  }, []);

  const loadContext = useCallback(
    async (studentId: string) => {
      if (!studentId) {
        setContext(null);
        return;
      }

      setContextLoading(true);
      setContextError(null);

      const result = await getProgrammeEnrollmentContext(studentId);
      if ('error' in result) {
        setContext(null);
        setContextError(result.error);
        setContextLoading(false);
        return;
      }

      setContext(result);
      setContextLoading(false);

      const option = result.programmes.find(
        (item) => item.program.id !== result.student.program_id && item.has_active_units
      );
      const currentSemester = Number(result.student.current_semester ?? 1);
      const semesters = option?.semesters ?? [];
      const modes = option?.program.study_modes ?? [];

      setNewProgramId(option?.program.id ?? '');
      setNewIntakeId(result.student.intake_id ?? '');
      setNewStudyMode(
        result.student.study_mode && modes.includes(result.student.study_mode)
          ? result.student.study_mode
          : modes.length === 1
            ? modes[0]
            : ''
      );
      setNewCurriculumId(option?.default_curriculum?.id ?? '');
      setNewSemester(
        semesters.length > 0
          ? String(semesters.includes(currentSemester) ? currentSemester : semesters[0])
          : ''
      );
      setReason('');
      setPreview(null);
      setFormError(null);

      if (result.student.program_id) {
        setResults((prev) =>
          prev.some((row) => row.id === result.student.id)
            ? prev
            : [
                {
                  id: result.student.id,
                  first_name: result.student.first_name,
                  last_name: result.student.last_name,
                  admission_number: result.student.admission_number,
                  student_number: result.student.student_number,
                  email: result.student.email,
                  status: result.student.status,
                  program_id: result.student.program_id,
                  program: result.student.program
                    ? {
                        id: result.student.program.id,
                        name: result.student.program.name,
                        code: result.student.program.code,
                      }
                    : null,
                },
                ...prev,
              ]
        );
      }

      void loadHistory(studentId);
    },
    [loadHistory]
  );

  useEffect(() => {
    void (async () => {
      setSearching(true);
      const response = await searchStudentsForEnrollment();
      if (!('error' in response)) setResults(response.students);
      setSearching(false);
    })();
  }, []);

  useEffect(() => {
    if (initialStudentId) {
      void loadContext(initialStudentId);
    } else {
      void loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    const response = await searchStudentsForEnrollment(query);
    if ('error' in response) {
      setContextError(response.error);
    } else {
      setResults(response.students);
    }
    setSearching(false);
  }

  function chooseStudent(studentId: string) {
    setSelectedStudentId(studentId);
    setResults([]);
    setSuccessMessage(null);
    void loadContext(studentId);
  }

  function handleProgrammeChange(programId: string) {
    const option = programmes.find((item) => item.program.id === programId) ?? null;
    const semesters = option?.semesters ?? [];
    const currentSemester = Number(student?.current_semester ?? 1);
    const modes = option?.program.study_modes ?? [];

    setNewProgramId(programId);
    setNewCurriculumId(option?.default_curriculum?.id ?? '');
    setNewSemester(
      semesters.length > 0
        ? String(semesters.includes(currentSemester) ? currentSemester : semesters[0])
        : ''
    );
    setNewStudyMode(
      student?.study_mode && modes.includes(student.study_mode)
        ? student.study_mode
        : modes.length === 1
          ? modes[0]
          : ''
    );
    setPreview(null);
    setFormError(null);
    setSuccessMessage(null);
  }

  function handleCurriculumChange(curriculumId: string) {
    const curriculum = availableCurricula.find((item) => item.id === curriculumId);
    setNewCurriculumId(curriculumId);
    if (curriculum && curriculum.semesters.length > 0) {
      const currentSemester = Number(student?.current_semester ?? 1);
      setNewSemester(
        String(
          curriculum.semesters.includes(currentSemester)
            ? currentSemester
            : curriculum.semesters[0]
        )
      );
    }
    setPreview(null);
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!student) return setFormError('Select a student first.');
    if (!newProgramId) return setFormError('Select the new programme.');
    if (newProgramId === student.program_id) {
      return setFormError('Select a programme different from the current one.');
    }
    if (!selectedCurriculum) {
      return setFormError(
        'The selected programme has no curriculum. Configure its curriculum and units first.'
      );
    }
    if (selectedCurriculum.unit_count === 0) {
      return setFormError(
        `Curriculum “${selectedCurriculum.name}” has no active units. Configure its units first.`
      );
    }
    if (studyModes.length > 0 && !newStudyMode) {
      return setFormError('Select a study mode for the new programme.');
    }
    if (!newSemester) {
      return setFormError('Select the semester the student should join.');
    }
    if (reason.trim().length < 3) {
      return setFormError('Provide a reason for the programme change (at least 3 characters).');
    }

    setPreviewLoading(true);
    const result = await previewProgrammeChange({
      studentId: student.id,
      newProgramId,
      newIntakeId: newIntakeId || null,
      newStudyMode: newStudyMode || null,
      newCurriculumId: selectedCurriculum.id,
    });
    setPreviewLoading(false);

    if ('error' in result) {
      setFormError(result.error);
      return;
    }

    setPreview(result.preview);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!student || !preview || !newSemester) return;

    setSubmitting(true);
    setFormError(null);

    const result = await changeStudentProgramme({
      studentId: student.id,
      newProgramId,
      newIntakeId: newIntakeId || null,
      newStudyMode: newStudyMode || null,
      newCurriculumId: selectedCurriculum?.id ?? null,
      newSemester: Number(newSemester),
      reason,
    });

    setSubmitting(false);

    if ('error' in result) {
      setFormError(result.error);
      return;
    }

    setConfirmOpen(false);
    setPreview(null);
    setSuccessMessage(
      `${result.result.student_name} moved to ${preview.new_program_code} — ${preview.new_program_name}. New admission number: ${preview.new_admission_number}.`
    );
    setReason('');
    await loadContext(student.id);
    await loadHistory(student.id);
    router.refresh();
  }

  const programOptions = [
    { value: '', label: 'Select new programme' },
    ...programmes
      .filter((option) => option.program.id !== student?.program_id)
      .map((option) => ({
        value: option.program.id,
        label: `${option.program.code} — ${option.program.name}${
          option.has_active_units ? '' : ' (no units configured)'
        }`,
      })),
  ];

  const curriculumOptions = availableCurricula.map((curriculum) => ({
    value: curriculum.id,
    label: `${curriculum.name} · ${curriculum.academic_year} ${curriculum.version} (${curriculum.unit_count} units)`,
  }));

  const semesterOptions = [
    { value: '', label: 'Select semester' },
    ...availableSemesters.map((semester) => ({
      value: String(semester),
      label: `Semester ${semester}`,
    })),
  ];

  const studyModeOptions = [
    { value: '', label: 'Select study mode' },
    ...studyModes.map((mode) => ({
      value: mode,
      label: mode.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    })),
  ];

  const intakeOptions = [
    { value: '', label: 'Keep current intake' },
    ...(context?.intakes ?? []).map((intake) => ({
      value: intake.id,
      label: `${intake.name}${intake.academic_year ? ` · ${intake.academic_year}` : ''}`,
    })),
  ];

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Programme change completed
          </p>
          <p className="mt-1">{successMessage}</p>
        </div>
      )}

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
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.id === selectedStudentId ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">
                            {row.first_name} {row.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{row.email}</p>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {row.admission_number ?? row.student_number}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.program ? `${row.program.code} — ${row.program.name}` : '—'}
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

          {contextLoading && (
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          )}

          {contextError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {contextError}
            </div>
          )}

          {student && !contextLoading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Admission #:{' '}
                      <span className="font-mono">
                        {student.admission_number ?? student.student_number}
                      </span>
                      {' · '}Student ID: <span className="font-mono">{student.id.slice(0, 8)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={student.status}>{student.status}</Badge>
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Open profile →
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Detail
                  label="Current programme"
                  value={
                    student.program
                      ? `${student.program.code} — ${student.program.name}`
                      : 'Not assigned'
                  }
                />
                <Detail label="Intake" value={student.intake?.name ?? 'Not set'} />
                <Detail label="Academic year" value={student.academic_year ?? 'Not set'} />
                <Detail label="Study mode" value={student.study_mode ?? 'Not set'} />
                <Detail
                  label="Semester"
                  value={student.current_semester ? `Semester ${student.current_semester}` : '—'}
                />
                <Detail label="Curriculum" value={student.curriculum?.name ?? 'Not pinned'} />
                <Detail label="Enrolled" value={formatDate(student.enrollment_date)} />
                <Detail label="Email" value={student.email} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {student && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-700" />
              Move to a new programme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="new_program" className="block text-sm font-medium text-slate-700">
                    New programme
                  </label>
                  <Select
                    id="new_program"
                    value={newProgramId}
                    options={programOptions}
                    onChange={handleProgrammeChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="new_intake" className="block text-sm font-medium text-slate-700">
                    Intake
                  </label>
                  <Select
                    id="new_intake"
                    value={newIntakeId}
                    options={intakeOptions}
                    onChange={setNewIntakeId}
                  />
                </div>

                <div>
                  <label htmlFor="new_study_mode" className="block text-sm font-medium text-slate-700">
                    Study mode
                  </label>
                  {studyModes.length > 0 ? (
                    <Select
                      id="new_study_mode"
                      value={newStudyMode}
                      options={studyModeOptions}
                      onChange={setNewStudyMode}
                      required
                    />
                  ) : (
                    <Input
                      id="new_study_mode"
                      value={newStudyMode}
                      onChange={(e) => setNewStudyMode(e.target.value)}
                      placeholder="Optional study mode"
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="new_curriculum" className="block text-sm font-medium text-slate-700">
                    Curriculum
                  </label>
                  <Select
                    id="new_curriculum"
                    value={newCurriculumId}
                    options={
                      curriculumOptions.length > 0
                        ? curriculumOptions
                        : [{ value: '', label: 'No curriculum configured' }]
                    }
                    onChange={handleCurriculumChange}
                    disabled={curriculumOptions.length === 0}
                  />
                </div>

                <div>
                  <label htmlFor="new_semester" className="block text-sm font-medium text-slate-700">
                    Semester to join
                  </label>
                  <Select
                    id="new_semester"
                    value={newSemester}
                    options={semesterOptions}
                    onChange={setNewSemester}
                    disabled={availableSemesters.length === 0}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    name="reason"
                    label="Reason for programme change"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Student requested a transfer to CPA Intermediate after completing foundation units."
                    required
                  />
                </div>
              </div>

              {selectedOption && !selectedOption.has_active_units && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    This programme has no active curriculum units. Configure the curriculum under
                    Curricula before changing the student.
                  </p>
                </div>
              )}

              {formError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={previewLoading || !newProgramId}>
                  <GraduationCap className="h-4 w-4" />
                  {previewLoading ? 'Generating preview…' : 'Review programme change'}
                </Button>
                <p className="text-xs text-slate-500">
                  The admission number is generated from the new programme&apos;s configured
                  format. Nothing is changed until you confirm.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-700" />
            {student ? `Programme history — ${student.first_name} ${student.last_name}` : 'Recent programme changes'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ) : history.length === 0 ? (
            <EmptyState
              title="No programme changes yet"
              description="Programme changes recorded through this page will appear here with the old and new admission numbers."
              icon={History}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                      {!student && (
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Student</th>
                      )}
                      <th className="px-3 py-2 text-left font-medium text-slate-500">From</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">To</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Admission number</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Changed by</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {formatDate(row.changed_at)}
                        </td>
                        {!student && (
                          <td className="px-3 py-2">
                            {row.student
                              ? `${row.student.first_name} ${row.student.last_name}`
                              : row.student_id.slice(0, 8)}
                            <p className="text-xs text-slate-500">
                              {row.student?.admission_number ?? row.student?.student_number ?? ''}
                            </p>
                          </td>
                        )}
                        <td className="px-3 py-2 text-slate-600">
                          {row.previous_program_code
                            ? `${row.previous_program_code} — ${row.previous_program_name}`
                            : '—'}
                          <p className="text-xs text-slate-500">
                            Sem {row.previous_semester ?? '—'} · {row.previous_intake_name ?? 'No intake'}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.new_program_code
                            ? `${row.new_program_code} — ${row.new_program_name}`
                            : '—'}
                          <p className="text-xs text-slate-500">
                            Sem {row.new_semester ?? '—'} · {row.new_intake_name ?? 'No intake'}
                          </p>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          <p>{row.previous_admission_number ?? '—'}</p>
                          <p className="text-slate-900">
                            <span className="text-slate-400">→ </span>
                            {row.new_admission_number ?? '—'}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.changed_by_name ?? 'System'}
                        </td>
                        <td className="max-w-xs px-3 py-2 text-slate-600">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm programme change"
        description="Review the details below. This action updates the student record, admission number and programme history together."
        size="lg"
      >
        {preview && student && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Student</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{preview.student_name}</p>
              <p className="text-xs text-slate-600">
                Current admission number:{' '}
                <span className="font-mono">{preview.previous_admission_number ?? '—'}</span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Current programme</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {student.program
                    ? `${student.program.code} — ${student.program.name}`
                    : 'Not assigned'}
                </p>
                <p className="mt-2 font-mono text-sm text-slate-700">
                  {preview.previous_admission_number ?? '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {student.curriculum?.name ?? 'No curriculum'} · Semester{' '}
                  {student.current_semester ?? '—'}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <p className="text-xs font-semibold uppercase text-blue-700">New programme</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {preview.new_program_code} — {preview.new_program_name}
                </p>
                <p className="mt-2 font-mono text-sm font-bold text-blue-800">
                  {preview.new_admission_number}
                </p>
                <p className="text-xs text-slate-500">
                  {preview.curriculum_name} · Semester {newSemester || '—'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <Detail label="Admission format" value={preview.admission_format} mono />
              <Detail label="Intake" value={preview.intake_name ?? 'Current intake'} />
              <Detail label="Study mode" value={preview.study_mode ?? 'Not set'} />
              <Detail label="Academic year" value={preview.academic_year} />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <p className="font-semibold">What happens on confirm</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>The student is moved to the new programme and admission number.</li>
                <li>The new curriculum and semester become the current registration context.</li>
                <li>Existing enrollments and academic records are preserved.</li>
                <li>The change is recorded in programme history and the audit log.</li>
              </ul>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Reason:</span> {reason}
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={submitting}>
                {submitting ? 'Applying change…' : 'Confirm programme change'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={mono ? 'font-mono text-sm text-slate-800' : 'text-sm text-slate-800'}>
        {value}
      </p>
    </div>
  );
}
