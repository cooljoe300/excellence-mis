'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { getStudents, deleteStudentCompletely } from '@/app/actions/students';
import { generateStudentLoginDetails } from '@/app/actions/students';
import { formatDate, getAdmissionNumber } from '@/lib/utils';
import { StudentSearch } from '@/components/students/student-search';
import { MessageCircle, Copy, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';

function getRegistrationSourceLabel(source: string | null): string {
  if (source === 'self_registered') return 'Self Registered';
  if (source === 'staff_registered') return 'Registered by Staff';
  return 'Unknown';
}

type StudentRow = Awaited<ReturnType<typeof getStudents>>[number];

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [loginDetails, setLoginDetails] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadStudents() {
      const data = await getStudents();
      setStudents(data);
      setLoading(false);
    }
    loadStudents();
  }, []);

  async function handleSendWhatsApp(studentId: string) {
    setGenerating(true);
    const result = await generateStudentLoginDetails(studentId);
    setGenerating(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setLoginDetails(result);
    setWhatsappModalOpen(true);
  }

  function formatPhoneForWhatsApp(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    }
    
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  function sendWhatsApp() {
    if (!loginDetails) return;
    
    const formattedPhone = formatPhoneForWhatsApp(loginDetails.phone);
    if (!formattedPhone) {
      alert('No phone number available for this student.');
      return;
    }
    
    const message = `Hello ${loginDetails.firstName} ${loginDetails.lastName},

Your Excellence Online College Student Portal login details have been reset.

Student Portal Login Details:

Admission Number: ${loginDetails.admissionNumber}
Email: ${loginDetails.email}
Temporary Password: ${loginDetails.temporaryPassword}

Student Portal: ${window.location.origin}/student

Please log in using the temporary password. For security purposes, you will be required to create a new password immediately after your first login.

Regards,
Excellence Online College`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  function copyLoginDetails() {
    if (!loginDetails) return;
    const text = `Student Portal Login Details\n\nAdmission Number: ${loginDetails.admissionNumber}\nEmail: ${loginDetails.email}\nTemporary Password: ${loginDetails.temporaryPassword}\n\nStudent Portal: ${window.location.origin}/student`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openDeleteModal(student: StudentRow) {
    setDeleteTarget(student);
    setDeleteConfirm('');
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteConfirm('');
  }

  const deleteReference = deleteTarget ? getAdmissionNumber(deleteTarget) : '';
  const deleteConfirmed =
    !!deleteTarget &&
    deleteConfirm.trim().toUpperCase() === String(deleteReference).trim().toUpperCase();

  async function handleDeleteStudent() {
    if (!deleteTarget || !deleteConfirmed) return;

    setDeleting(true);
    const result = await deleteStudentCompletely(deleteTarget.id, deleteConfirm);
    setDeleting(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setStudents((current) => current.filter((student) => student.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteConfirm('');

    if (result.warning) {
      alert(result.warning);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading students...</div>;
  }

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
        <StudentSearch />
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
                <th className="px-4 py-2 text-left font-medium text-slate-500 w-16">S/N</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Admission #</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Name</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Email</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Program</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Intake(s)</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Source</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">LMS</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Enrolled</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student, index) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-600">{index + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs">{getAdmissionNumber(student)}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{student.email}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {student.program && typeof student.program === 'object' && 'name' in student.program ? (student.program as { name: string }).name : '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {student.intakes && Array.isArray(student.intakes) && student.intakes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {student.intakes.map((intake: any) => (
                          <Badge key={intake.id} status="pending" variant="outline">
                            {intake.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      status={student.registration_source === 'self_registered' ? 'pending' : 'active'}
                    >
                      {getRegistrationSourceLabel(student.registration_source)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2">
                    <Badge status={student.status}>{student.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(student.enrollment_date)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {student.profile_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendWhatsApp(student.id)}
                          disabled={generating}
                          title="Send login details via WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Link href={`/dashboard/students/${student.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(student)}
                        title="Delete student permanently"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      {/* WhatsApp Modal */}
      <Modal
        open={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        title="Student Login Details"
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Admission Number</p>
              <p className="text-lg font-mono font-bold text-slate-900">{loginDetails?.admissionNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
              <p className="text-sm font-medium text-slate-900">{loginDetails?.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Temporary Password</p>
              <p className="text-lg font-mono font-bold text-slate-900">{loginDetails?.temporaryPassword}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Student Portal</p>
              <p className="text-sm font-medium text-blue-600">{window.location.origin}/student</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={copyLoginDetails} variant="secondary" className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Details'}
            </Button>
            <Button onClick={sendWhatsApp} variant="secondary" className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
            <Button onClick={() => setWhatsappModalOpen(false)} className="flex-1">
              Done
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            A new temporary password has been generated. The student will be required to change it on next login.
          </p>
        </div>
      </Modal>

      {/* Permanent delete modal */}
      <Modal
        open={!!deleteTarget}
        onClose={closeDeleteModal}
        title="Delete student permanently"
        size="md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">This action cannot be undone.</p>
                <p className="mt-1">
                  Deleting <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong>{' '}
                  ({deleteReference}) also deletes their portal login, enrollments, attendance,
                  invoices, payment history, discounts, intakes and payment requests.
                </p>
                {deleteTarget.profile_id && (
                  <p className="mt-2">
                    If you only want to stop the student from studying, set their status to{' '}
                    <strong>Withdrawn</strong> instead so their records are kept.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="delete-confirmation" className="block text-sm font-medium text-slate-700">
                Type <span className="font-mono font-semibold text-slate-900">{deleteReference}</span>{' '}
                to confirm
              </label>
              <input
                id="delete-confirmation"
                type="text"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && deleteConfirmed && !deleting) {
                    void handleDeleteStudent();
                  }
                }}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder={deleteReference}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteStudent}
                disabled={!deleteConfirmed || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete permanently'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
