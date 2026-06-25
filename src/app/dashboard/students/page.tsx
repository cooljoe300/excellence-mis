import { Suspense } from 'react';
import Link from 'next/link';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStudents } from '@/app/actions/students';
import { formatDate, getAdmissionNumber } from '@/lib/utils';
import { StudentSearch } from '@/components/students/student-search';

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const students = await getStudents(q);

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage student records and profiles"
        action={
          <Link href="/dashboard/students/new">
            <Button>+ Register Student</Button>
          </Link>
        }
      />

      <div className="mb-6">
        <Suspense fallback={<div className="h-10 max-w-md animate-pulse rounded-lg bg-slate-100" />}>
          <StudentSearch defaultValue={q} />
        </Suspense>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-slate-500">No students found.</p>
          <Link href="/dashboard/students/new" className="mt-2 inline-block text-blue-700 hover:underline">
            Add your first student
          </Link>
        </div>
      ) : (
        <DataTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Admission #</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Email</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Program</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Enrolled</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">{getAdmissionNumber(student)}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{student.email}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {(student.program as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge status={student.status}>{student.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(student.enrollment_date)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/dashboard/students/${student.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </div>
  );
}
