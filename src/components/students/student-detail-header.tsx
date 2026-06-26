import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteStudentButton } from '@/components/students/delete-student-button';
import { formatDate, getAdmissionNumber } from '@/lib/utils';
import { isSelfRegisteredStudent } from '@/lib/auth';
import type { Student } from '@/lib/types';
import { ChevronLeft, CreditCard } from 'lucide-react';

export function StudentDetailHeader({
  student,
  hideActions,
}: {
  student: Student;
  hideActions?: boolean;
}) {
  const admissionNumber = getAdmissionNumber(student);
  const selfRegistered = isSelfRegisteredStudent(student);
  const programName = (student.program as { name: string } | null)?.name ?? '—';
  const intakeName = (student.intake as { name: string } | null)?.name ?? '—';

  return (
    <div className="mb-4">
      <Link
        href="/dashboard/students"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to students
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-lg font-bold text-slate-900">{admissionNumber}</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-800">
            {student.first_name} {student.last_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{student.email}</p>
        </div>

        {!hideActions && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/students/${student.id}/id-card`} target="_blank">
              <Button variant="secondary" size="sm">
                <CreditCard className="h-4 w-4" />
                ID Card
              </Button>
            </Link>
            <Link href={`/dashboard/students/${student.id}?edit=true`}>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </Link>
            <DeleteStudentButton
              id={student.id}
              name={`${student.first_name} ${student.last_name}`}
            />
          </div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium text-slate-500">Status</th>
              <th className="px-4 py-2.5 font-medium text-slate-500">Programme</th>
              <th className="px-4 py-2.5 font-medium text-slate-500">Intake</th>
              <th className="px-4 py-2.5 font-medium text-slate-500">Enrolled</th>
              <th className="px-4 py-2.5 font-medium text-slate-500">LMS</th>
              <th className="px-4 py-2.5 font-medium text-slate-500">Source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3">
                <Badge status={student.status}>{student.status}</Badge>
              </td>
              <td className="px-4 py-3 text-slate-700">{programName}</td>
              <td className="px-4 py-3 text-slate-600">{intakeName}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(student.enrollment_date)}</td>
              <td className="px-4 py-3">
                <Badge
                  status={
                    student.lms_sync_status === 'synced'
                      ? 'active'
                      : student.lms_sync_status === 'failed'
                        ? 'withdrawn'
                        : 'pending'
                  }
                >
                  {student.lms_sync_status === 'synced'
                    ? 'Imported'
                    : student.lms_sync_status === 'failed'
                      ? 'Failed'
                      : 'Pending'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {selfRegistered ? (
                  <Badge status="pending">Self-registered</Badge>
                ) : (
                  <span className="text-slate-500">Staff</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
