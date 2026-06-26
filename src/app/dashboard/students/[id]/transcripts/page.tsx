import { notFound } from 'next/navigation';
import { getStudent } from '@/app/actions/students';
import { getEnrollmentsForStudent } from '@/app/actions/enrollments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, getAdmissionNumber } from '@/lib/utils';
import type { AcademicTerm, Course, Enrollment } from '@/lib/types';

export default async function StudentTranscriptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let student;
  let enrollments;
  try {
    [student, enrollments] = await Promise.all([getStudent(id), getEnrollmentsForStudent(id)]);
  } catch {
    notFound();
  }

  const completed = enrollments.filter(
    (e) => e.status === 'completed' || e.grade != null
  ) as (Enrollment & { course: Course; term: AcademicTerm })[];

  const admissionNumber = getAdmissionNumber(student);
  const programName = (student.program as { name: string } | null)?.name ?? '—';

  if (completed.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
        No transcript data yet. Completed units with grades will appear here.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-8 space-y-1 text-sm">
          <p className="text-lg font-bold text-slate-900">
            {student.first_name} {student.last_name}
          </p>
          <p className="font-mono text-slate-600">{admissionNumber}</p>
          <p className="text-slate-600">{programName}</p>
          <p className="text-slate-500">Enrolled {formatDate(student.enrollment_date)}</p>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="pb-2 font-medium">Term</th>
              <th className="pb-2 font-medium">Unit</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Grade</th>
              <th className="pb-2 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {completed.map((row) => (
              <tr key={row.id}>
                <td className="py-2.5 text-slate-600">{row.term.name}</td>
                <td className="py-2.5">
                  <span className="font-mono">{row.course.code}</span> — {row.course.name}
                </td>
                <td className="py-2.5 capitalize">{row.status}</td>
                <td className="py-2.5 font-semibold">{row.grade ?? '—'}</td>
                <td className="py-2.5 text-right">{row.score ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Official transcript · Excellence Online College · {formatDate(new Date().toISOString())}
        </p>
      </CardContent>
    </Card>
  );
}
