import { notFound } from 'next/navigation';
import { getStudent } from '@/app/actions/students';
import { getEnrollmentsForStudent } from '@/app/actions/enrollments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, getAdmissionNumber } from '@/lib/utils';
import type { AcademicTerm, Course, Enrollment } from '@/lib/types';

export default async function StudentResultsPage({
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

  const withGrades = enrollments.filter(
    (e) => e.grade != null || e.score != null
  ) as (Enrollment & { course: Course; term: AcademicTerm })[];

  const admissionNumber = getAdmissionNumber(student);
  const programName = (student.program as { name: string } | null)?.name ?? '—';

  if (withGrades.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
        No results recorded yet. Grades will appear here once entered by staff.
      </div>
    );
  }

  const byTerm = new Map<string, { term: AcademicTerm; rows: typeof withGrades }>();
  for (const enrollment of withGrades) {
    const key = enrollment.term_id;
    if (!byTerm.has(key)) {
      byTerm.set(key, { term: enrollment.term as AcademicTerm, rows: [] });
    }
    byTerm.get(key)!.rows.push(enrollment);
  }

  return (
    <div className="space-y-6">
      {Array.from(byTerm.values()).map(({ term, rows }) => (
        <Card key={term.id}>
          <CardHeader>
            <CardTitle>Results Slip — {term.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid gap-2 border-b border-slate-100 pb-4 text-sm sm:grid-cols-2">
              <p>
                <span className="text-slate-500">Student:</span>{' '}
                <span className="font-medium">
                  {student.first_name} {student.last_name}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Admission:</span>{' '}
                <span className="font-mono font-medium">{admissionNumber}</span>
              </p>
              <p>
                <span className="text-slate-500">Programme:</span>{' '}
                <span className="font-medium">{programName}</span>
              </p>
              <p>
                <span className="text-slate-500">Term:</span>{' '}
                <span className="font-medium">{term.name}</span>
              </p>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Unit code</th>
                  <th className="pb-2 font-medium">Unit name</th>
                  <th className="pb-2 font-medium">Grade</th>
                  <th className="pb-2 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 font-mono">{row.course.code}</td>
                    <td className="py-2.5">{row.course.name}</td>
                    <td className="py-2.5 font-semibold">{row.grade ?? '—'}</td>
                    <td className="py-2.5 text-right">{row.score ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-6 text-xs text-slate-400">
              Generated {formatDate(new Date().toISOString())} · Excellence Online College
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
