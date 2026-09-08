'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DEFAULT_REPORT_FILTERS, type ReportFilters, type ReportKey } from '@/lib/reports/build-report-table';
import type { ReportsBundle } from '@/app/actions/reports';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

const STUDENT_STATUS = ['active', 'inactive', 'graduated', 'suspended', 'withdrawn'];
const PAYMENT_STATUS = ['pending', 'paid', 'partial', 'overdue', 'waived'];
const ENROLLMENT_STATUS = ['pending', 'active', 'completed', 'dropped'];
const ATTENDANCE_STATUS = ['present', 'absent', 'late', 'excused'];

export function ReportFilterPanel({
  data,
  reportKey,
  draft,
  onDraftChange,
  onApply,
  onClear,
}: {
  data: ReportsBundle;
  reportKey: ReportKey;
  draft: ReportFilters;
  onDraftChange: (filters: ReportFilters) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(true);

  const isStudent = reportKey.includes('student') || ['active-students', 'inactive-students', 'new-admissions', 'graduated-students', 'withdrawn-students'].includes(reportKey);
  const isFinance = reportKey.includes('fee') || reportKey.includes('paid') || reportKey.includes('balances') || reportKey.includes('payment');
  const isEnrollment = reportKey.includes('enrollment') || reportKey === 'student-academic-records' || reportKey === 'unit-enrollments';
  const isAttendance = reportKey === 'attendance';
  const showDates = isFinance || isAttendance || isStudent || isEnrollment;
  const showProgram = reportKey !== 'executive-summary';
  const showIntake = isStudent || isFinance || isEnrollment || isAttendance;
  const showGender = isStudent;
  const showPayment = isFinance;
  const showStatus = reportKey !== 'executive-summary' && reportKey !== 'programs' && reportKey !== 'courses' && !isFinance;

  const statusOptions = useMemo(() => {
    const values = isFinance
      ? PAYMENT_STATUS
      : isEnrollment
        ? ENROLLMENT_STATUS
        : isAttendance
          ? ATTENDANCE_STATUS
          : STUDENT_STATUS;
    return [{ value: '', label: 'All statuses' }, ...values.map((value) => ({ value, label: value }))];
  }, [isAttendance, isEnrollment, isFinance]);

  function update<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    onDraftChange({ ...draft, [key]: value });
  }

  return (
    <section className="no-print rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left md:hidden"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-sm font-semibold text-slate-900">Filters</span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? 'block' : 'hidden'} space-y-4 p-4 md:block`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showProgram && (
            <Select
              label="Programme"
              value={draft.programId}
              onChange={(event) => update('programId', event.target.value)}
              options={[
                { value: '', label: 'All programmes' },
                ...data.programs.map((program) => ({ value: program.id, label: program.name })),
              ]}
            />
          )}
          {showIntake && (
            <Select
              label="Intake"
              value={draft.intakeId}
              onChange={(event) => update('intakeId', event.target.value)}
              options={[
                { value: '', label: 'All intakes' },
                ...data.intakes.map((intake) => ({ value: intake.id, label: intake.name })),
              ]}
            />
          )}
          {showStatus && (
            <Select
              label="Student / Record Status"
              value={draft.status}
              onChange={(event) => update('status', event.target.value)}
              options={statusOptions}
            />
          )}
          {showGender && (
            <Select
              label="Gender"
              value={draft.gender}
              onChange={(event) => update('gender', event.target.value)}
              options={[
                { value: '', label: 'All' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
          )}
          {showPayment && (
            <Select
              label="Payment Status"
              value={draft.paymentStatus}
              onChange={(event) => update('paymentStatus', event.target.value)}
              options={[{ value: '', label: 'All payment statuses' }, ...PAYMENT_STATUS.map((value) => ({ value, label: value }))]}
            />
          )}
          <Input
            label="Student Name"
            value={draft.studentName}
            onChange={(event) => update('studentName', event.target.value)}
            placeholder="First or last name"
          />
          <Input
            label="Admission Number"
            value={draft.admissionNumber}
            onChange={(event) => update('admissionNumber', event.target.value)}
            placeholder="Admission no."
          />
          {showDates && (
            <>
              <Input label="Date From" type="date" value={draft.dateFrom} onChange={(event) => update('dateFrom', event.target.value)} />
              <Input label="Date To" type="date" value={draft.dateTo} onChange={(event) => update('dateTo', event.target.value)} />
            </>
          )}
          <Input
            label="Search"
            value={draft.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Name, admission no., email..."
            className="sm:col-span-2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onApply}>
            Apply Filters
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onDraftChange(DEFAULT_REPORT_FILTERS);
              onClear();
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </section>
  );
}
