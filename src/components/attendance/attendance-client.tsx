'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { recordAttendance } from '@/app/actions/attendance';
import type { Attendance, Enrollment } from '@/lib/types';
import { formatDate } from '@/lib/utils';

function AttendanceFormModal({
  enrollments,
  onClose,
}: {
  enrollments: Enrollment[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await recordAttendance(new FormData(e.currentTarget));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Record Attendance</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Select
            name="enrollment_id"
            label="Enrollment"
            options={[
              { value: '', label: 'Select enrollment' },
              ...enrollments.map((e) => ({
                value: e.id,
                label: `${(e.student as { first_name: string; last_name: string })?.first_name} ${(e.student as { first_name: string; last_name: string })?.last_name} — ${(e.course as { code: string })?.code}`,
              })),
            ]}
            required
          />
          <Input name="date" label="Date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          <Select
            name="status"
            label="Status"
            defaultValue="present"
            options={[
              { value: 'present', label: 'Present' },
              { value: 'absent', label: 'Absent' },
              { value: 'late', label: 'Late' },
              { value: 'excused', label: 'Excused' },
            ]}
          />
          <Input name="notes" label="Notes" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Record'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AttendanceClient({
  attendance,
  enrollments,
}: {
  attendance: Attendance[];
  enrollments: Enrollment[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track student attendance by course enrollment"
        action={<Button onClick={() => setShowForm(true)}>+ Record Attendance</Button>}
      />

      {attendance.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No attendance records yet.
        </div>
      ) : (
        <DataTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Student</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Course</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.map((record) => {
                const enrollment = record.enrollment as Enrollment & {
                  student?: { first_name: string; last_name: string };
                  course?: { code: string; name: string };
                };
                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-600">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 font-medium">
                      {enrollment?.student?.first_name} {enrollment?.student?.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {enrollment?.course?.code} — {enrollment?.course?.name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={record.status}>{record.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{record.notes ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      )}

      {showForm && (
        <AttendanceFormModal enrollments={enrollments} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
