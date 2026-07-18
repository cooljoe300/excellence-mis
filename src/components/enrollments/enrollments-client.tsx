'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { createEnrollment } from '@/app/actions/enrollments';
import { DeregistrationRequestsPanel } from '@/components/enrollments/deregistration-requests-panel';
import type { AcademicTerm, Course, Enrollment, Student, StudentDeregistrationRequest } from '@/lib/types';
import { formatCurrency, formatDate, getAdmissionNumber } from '@/lib/utils';
import { ClipboardList, Search, Filter, RefreshCw, Download, Eye, User, FileText, CreditCard, MoreHorizontal } from 'lucide-react';

type GroupedStudentEnrollment = {
  key: string;
  studentId: string;
  termId: string;
  student: Student;
  term: AcademicTerm;
  units: { enrollment: Enrollment; course: Course }[];
  totalFee: number;
  enrolledAt: string;
};

function groupEnrollmentsByStudent(enrollments: Enrollment[]): GroupedStudentEnrollment[] {
  const map = new Map<string, GroupedStudentEnrollment>();

  for (const enrollment of enrollments) {
    const student = enrollment.student as Student;
    const term = enrollment.term as AcademicTerm;
    const course = enrollment.course as Course;
    const key = `${enrollment.student_id}:${enrollment.term_id}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        studentId: enrollment.student_id,
        termId: enrollment.term_id,
        student,
        term,
        units: [],
        totalFee: 0,
        enrolledAt: enrollment.enrolled_at,
      });
    }

    const group = map.get(key)!;
    group.units.push({ enrollment, course });
    group.totalFee += Number(course?.unit_fee ?? 0);
    if (enrollment.enrolled_at > group.enrolledAt) {
      group.enrolledAt = enrollment.enrolled_at;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}

function EnrollmentFormModal({
  students,
  courses,
  terms,
  onClose,
}: {
  students: Student[];
  courses: Course[];
  terms: AcademicTerm[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { success } = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createEnrollment(new FormData(e.currentTarget));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    success('Enrollment created successfully');
    router.refresh();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="New Enrollment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            name="student_id"
            label="Student"
            options={[
              { value: '', label: 'Select student' },
              ...students.map((s) => ({
                value: s.id,
                label: `${getAdmissionNumber(s)} — ${s.first_name} ${s.last_name}`,
              })),
            ]}
            required
          />
          <Select
            name="course_id"
            label="Course / Unit"
            options={[
              { value: '', label: 'Select unit' },
              ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
            ]}
            required
          />
          <Select
            name="term_id"
            label="Academic term"
            options={[
              { value: '', label: 'Select term' },
              ...terms.map((t) => ({ value: t.id, label: t.name })),
            ]}
            required
          />
          <Select
            name="status"
            label="Status"
            defaultValue="active"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'dropped', label: 'Dropped' },
            ]}
          />
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Enroll'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

export function EnrollmentsClient({
  enrollments,
  students,
  courses,
  terms,
  pendingDeregistrations = [],
  deregistrationCourseMap = {},
}: {
  enrollments: Enrollment[];
  students: Student[];
  courses: Course[];
  terms: AcademicTerm[];
  pendingDeregistrations?: StudentDeregistrationRequest[];
  deregistrationCourseMap?: Record<string, { code: string; name: string }>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const grouped = useMemo(() => groupEnrollmentsByStudent(enrollments), [enrollments]);

  const filteredGroups = useMemo(() => {
    return grouped.filter((group) => {
      const matchesSearch = 
        searchQuery === '' ||
        group.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getAdmissionNumber(group.student).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ||
        group.units.some(u => u.enrollment.status === statusFilter);
      
      return matchesSearch && matchesStatus;
    });
  }, [grouped, searchQuery, statusFilter]);

  const activeCount = grouped.filter(g => g.units.some(u => u.enrollment.status === 'active')).length;
  const pendingCount = grouped.filter(g => g.units.some(u => u.enrollment.status === 'pending')).length;
  const completedCount = grouped.filter(g => g.units.every(u => u.enrollment.status === 'completed')).length;

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="One record per student showing all registered units"
        action={<Button onClick={() => setShowForm(true)}>+ New Enrollment</Button>}
      />

      <div className="mb-6">
        <DeregistrationRequestsPanel
          requests={pendingDeregistrations}
          courseMap={deregistrationCourseMap}
        />
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No enrollments yet"
          description="Create your first enrollment to register a student in a course."
          action={<Button onClick={() => setShowForm(true)}>+ New Enrollment</Button>}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Total Enrollments</p>
              <p className="text-lg font-semibold text-slate-900">{grouped.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-lg font-semibold text-emerald-600">{activeCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-lg font-semibold text-amber-600">{pendingCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Completed</p>
              <p className="text-lg font-semibold text-blue-600">{completedCount}</p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or admission #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
            <Button variant="secondary" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <DataTable>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Admission #</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Student</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Program</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Term</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Units</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Total Fee</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Enrolled</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGroups.map((group, index) => (
                    <tr key={group.key} className={`hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-3 py-2.5 font-mono text-slate-600">
                        {getAdmissionNumber(group.student)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/dashboard/students/${group.studentId}`}
                          className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          {group.student?.first_name} {group.student?.last_name}
                        </Link>
                        <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{group.student?.email}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {(group.student?.program as { name: string } | null)?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{group.term?.name ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {group.units.slice(0, 2).map(({ enrollment, course }) => (
                            <span key={enrollment.id} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                              {course?.code}
                            </span>
                          ))}
                          {group.units.length > 2 && (
                            <span className="text-[10px] text-slate-500">+{group.units.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {group.units.slice(0, 2).map(({ enrollment }) => (
                            <Badge key={enrollment.id} status={enrollment.status} className="text-[10px] px-1.5 py-0.5">
                              {enrollment.status}
                            </Badge>
                          ))}
                          {group.units.length > 2 && (
                            <span className="text-[10px] text-slate-500">+{group.units.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {formatCurrency(group.totalFee)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{formatDate(group.enrolledAt)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/students/${group.studentId}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Student">
                              <User className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/students/${group.studentId}/enrollment`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Enrollment">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/students/${group.studentId}/fees`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Fee Statement">
                              <CreditCard className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTable>
        </>
      )}

      {showForm && (
        <EnrollmentFormModal
          students={students}
          courses={courses}
          terms={terms}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
