import { notFound } from 'next/navigation';
import { getEnrollmentsForStudent } from '@/app/actions/enrollments';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AcademicTerm, Course, Enrollment } from '@/lib/types';

export default async function StudentEnrollmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let enrollments;
  try {
    enrollments = await getEnrollmentsForStudent(id);
  } catch {
    notFound();
  }

  const byTerm = new Map<
    string,
    {
      term: AcademicTerm;
      units: { enrollment: Enrollment; course: Course }[];
      totalFee: number;
    }
  >();

  for (const enrollment of enrollments) {
    const term = enrollment.term as AcademicTerm;
    const course = enrollment.course as Course;
    const key = enrollment.term_id;

    if (!byTerm.has(key)) {
      byTerm.set(key, { term, units: [], totalFee: 0 });
    }

    const group = byTerm.get(key)!;
    group.units.push({ enrollment, course });
    group.totalFee += Number(course?.unit_fee ?? 0);
  }

  const groups = Array.from(byTerm.values()).sort((a, b) =>
    b.term.start_date.localeCompare(a.term.start_date)
  );

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
        No enrolment profiles yet. Register courses under the Course Registration tab.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ term, units, totalFee }) => (
        <Card key={term.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{term.name}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{formatDate(term.start_date)} — {formatDate(term.end_date)}</span>
                {term.is_current && <Badge status="active">Current</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-slate-100 text-left text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">Unit</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Enrolled</th>
                    <th className="pb-2 font-medium">Grade</th>
                    <th className="pb-2 text-right font-medium">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map(({ enrollment, course }) => (
                    <tr key={enrollment.id}>
                      <td className="py-3 font-medium text-slate-900">
                        {course.code} — {course.name}
                      </td>
                      <td className="py-3">
                        <Badge status={enrollment.status}>{enrollment.status}</Badge>
                      </td>
                      <td className="py-3 text-slate-600">{formatDate(enrollment.enrolled_at)}</td>
                      <td className="py-3 text-slate-600">
                        {enrollment.grade ?? '—'}
                        {enrollment.score != null ? ` (${enrollment.score})` : ''}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(course.unit_fee ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="pt-3 text-right font-semibold text-slate-700">
                      Term total
                    </td>
                    <td className="pt-3 text-right font-bold text-blue-700">
                      {formatCurrency(totalFee)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
