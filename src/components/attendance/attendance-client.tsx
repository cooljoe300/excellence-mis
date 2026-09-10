'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Select from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { recordAttendance } from '@/app/actions/attendance';
import type { Attendance, Enrollment } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { CalendarCheck } from 'lucide-react';

function AttendanceFormModal({
  enrollments,
  onClose,
}: {
  enrollments: Enrollment[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { success } = useToast();
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
    success('Attendance recorded successfully');
    router.refresh();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Record Attendance" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
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
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Record'}</Button>
        </div>
      </form>
    </Modal>
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
        <EmptyState
          icon={CalendarCheck}
          title="No attendance records yet"
          description="Start tracking student attendance by recording your first entry."
          action={<Button onClick={() => setShowForm(true)}>+ Record Attendance</Button>}
        />
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => {
                const enrollment = record.enrollment as Enrollment & {
                  student?: { first_name: string; last_name: string };
                  course?: { code: string; name: string };
                };
                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-muted">{formatDate(record.date)}</TableCell>
                    <TableCell className="font-medium">
                      {enrollment?.student?.first_name} {enrollment?.student?.last_name}
                    </TableCell>
                    <TableCell className="text-muted">
                      {enrollment?.course?.code} — {enrollment?.course?.name}
                    </TableCell>
                    <TableCell>
                      <Badge status={record.status}>{record.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted">{record.notes ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTable>
      )}

      {showForm && (
        <AttendanceFormModal enrollments={enrollments} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
