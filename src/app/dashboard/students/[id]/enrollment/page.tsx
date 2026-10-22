'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getEnrollmentsForStudent, deleteEnrollment } from '@/app/actions/enrollments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AcademicTerm, Course, Enrollment } from '@/lib/types';
import { X } from 'lucide-react';

export default function StudentEnrollmentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deregisterModalOpen, setDeregisterModalOpen] = useState(false);
  const [enrollmentToDeregister, setEnrollmentToDeregister] = useState<Enrollment | null>(null);
  const [deregisterLoading, setDeregisterLoading] = useState(false);
  const [deregisterError, setDeregisterError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getEnrollmentsForStudent(studentId);
        setEnrollments(data);
      } catch {
        router.push('/dashboard/students');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId, router]);

  function openDeregisterModal(enrollment: Enrollment) {
    setEnrollmentToDeregister(enrollment);
    setDeregisterError(null);
    setDeregisterModalOpen(true);
  }

  async function handleDeregister() {
    if (!enrollmentToDeregister) return;
    setDeregisterLoading(true);
    setDeregisterError(null);

    const response = await deleteEnrollment(enrollmentToDeregister.id);

    if (response.error) {
      setDeregisterError(response.error);
      setDeregisterLoading(false);
      return;
    }

    setDeregisterModalOpen(false);
    setEnrollmentToDeregister(null);
    setDeregisterLoading(false);
    setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentToDeregister.id));
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
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
                    <th className="pb-2 text-right font-medium">Actions</th>
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
                      <td className="py-3 text-right">
                        {(enrollment.status === 'active' || enrollment.status === 'pending') && 
                         enrollment.grade == null && enrollment.score == null && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeregisterModal(enrollment)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Deregister Unit"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="pt-3 text-right font-semibold text-slate-700">
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

      {/* Deregister Confirmation Modal */}
      <Modal
        open={deregisterModalOpen}
        onClose={() => setDeregisterModalOpen(false)}
        title="Deregister Unit?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to deregister <strong>{enrollmentToDeregister?.course?.code} — {enrollmentToDeregister?.course?.name}</strong> for this student?
          </p>
          <p className="text-xs text-slate-500">
            This will mark the enrollment as deregistered and process fee adjustments according to college policy.
          </p>
          {deregisterError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {deregisterError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeregisterModalOpen(false)}
              disabled={deregisterLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeregister}
              disabled={deregisterLoading}
              variant="danger"
            >
              {deregisterLoading ? 'Deregistering...' : 'Deregister Unit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
