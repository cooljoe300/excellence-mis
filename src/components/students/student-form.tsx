'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { createStudent, updateStudent } from '@/app/actions/students';
import { getCurrentAcademicTermId } from '@/app/actions/enrollments';
import { getDefaultCurriculumUnits } from '@/app/actions/curriculum';
import {
  getUnitRegistrationContext,
  saveUnitRegistration,
} from '@/app/actions/unit-registration';
import type { Program, Student, Intake } from '@/lib/types';
import { UserPlus, Info, Copy, Mail, CheckCircle2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { PassportPhotoUpload } from './student-id-card-preview';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function StudentForm({
  programs,
  intakes,
  student,
}: {
  programs: Program[];
  intakes: Intake[];
  student?: Student;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginDetails, setLoginDetails] = useState<{
    admissionNumber: string;
    email: string;
    temporaryPassword: string | null;
    studentId: string;
    phone: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(student?.photo_url ?? null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);

  const [programId, setProgramId] = useState(student?.program_id ?? '');
  const [studyMode, setStudyMode] = useState(student?.study_mode ?? '');
  const [termId, setTermId] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<
    { id: string; code: string; name: string; unit_fee: number }[]
  >([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [semester, setSemester] = useState<number | null>(null);
  const [semesters, setSemesters] = useState<number[]>([]);
  const [curriculumName, setCurriculumName] = useState<string | null>(null);
  const [registrationTermId, setRegistrationTermId] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedCourseIds), [selectedCourseIds]);
  const studyModeOptions = useMemo(() => {
    const program = programs.find((item) => item.id === programId);
    return program?.study_modes ?? [];
  }, [programs, programId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await getCurrentAcademicTermId();
      if (!cancelled) setTermId(id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadUnits(nextSemester?: number | null) {
    setCoursesError('');

    if (!programId) {
      setAvailableCourses([]);
      setSelectedCourseIds([]);
      setSemester(null);
      setSemesters([]);
      setCurriculumName(null);
      setRegistrationTermId(null);
      return;
    }

    setCoursesLoading(true);
    try {
      if (student?.id) {
        const result = await getUnitRegistrationContext(student.id, {
          semester: nextSemester ?? semester ?? undefined,
        });

        if ('error' in result) {
          setAvailableCourses([]);
          setCoursesError(result.error);
          return;
        }

        setAvailableCourses(result.units);
        setSelectedCourseIds(result.selected_course_ids);
        setSemester(result.semester);
        setSemesters(result.semesters);
        setCurriculumName(result.curriculum.name);
        setRegistrationTermId(result.termId);
      } else {
        const result = await getDefaultCurriculumUnits(
          programId,
          nextSemester ?? semester ?? undefined
        );

        if ('error' in result) {
          setAvailableCourses([]);
          setCoursesError(result.error);
          return;
        }

        setAvailableCourses(result.units);
        setSelectedCourseIds([]);
        setSemester(result.semester);
        setSemesters(result.semesters);
        setCurriculumName(result.curriculum.name);
        setRegistrationTermId(null);
      }
    } catch {
      setCoursesError('Failed to load the programme curriculum.');
    } finally {
      setCoursesLoading(false);
    }
  }

  useEffect(() => {
    void loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, student?.id, termId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    // Log all form data for debugging
    console.log('Form data entries before photo:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
    }

    // Append the selected photo file if one was chosen
    if (selectedPhotoFile) {
      console.log('Appending photo file to form data:', selectedPhotoFile.name, selectedPhotoFile.size, selectedPhotoFile.type);
      formData.append('photo', selectedPhotoFile);
    } else {
      console.log('No photo file selected in state');
    }

    // Log form data after photo append
    console.log('Form data entries after photo:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
    }

    const result = student
      ? await updateStudent(student.id, formData)
      : await createStudent(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const studentId =
      student?.id ?? (typeof result === 'object' && 'id' in result ? (result.id as string) : null);

    let feePaymentId: string | null = null;

    const effectiveTermId = registrationTermId ?? termId;
    const shouldSaveUnits =
      Boolean(studentId && effectiveTermId && semester) && (Boolean(student) || selectedCourseIds.length > 0);

    if (studentId && effectiveTermId && semester && shouldSaveUnits) {
      const enrollResult = await saveUnitRegistration({
        studentId,
        termId: effectiveTermId,
        semester,
        courseIds: selectedCourseIds,
      });

      if ('error' in enrollResult) {
        setError(enrollResult.error ?? 'Unable to save unit registration.');
        setLoading(false);
        return;
      }
      feePaymentId = enrollResult.feePaymentId ?? null;
    }

    // Show login details modal for new student registration
    if (!student && 'temporaryPassword' in result && result.temporaryPassword) {
      setLoginDetails({
        admissionNumber: (result as any).admissionNumber || '',
        email: (result as any).email || '',
        temporaryPassword: result.temporaryPassword as string,
        studentId: (result as any).id || '',
        phone: (result as any).phone || '',
        firstName: (result as any).first_name || '',
        lastName: (result as any).last_name || '',
      });
      setShowLoginModal(true);
      setLoading(false);
      return;
    }

    if ('id' in result && result.id) {
      const params = new URLSearchParams({ registered: 'true' });
      if (feePaymentId) params.set('invoice', feePaymentId);
      router.push(`/dashboard/students/${result.id}?${params.toString()}`);
    } else {
      router.push('/dashboard/students');
    }
    router.refresh();
  }

  function copyLoginDetails() {
    if (!loginDetails) return;
    const text = `Student Portal Login Details\n\nAdmission Number: ${loginDetails.admissionNumber}\nEmail: ${loginDetails.email}\nTemporary Password: ${loginDetails.temporaryPassword}\n\nStudent Portal: ${window.location.origin}/student`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendLoginDetailsEmail() {
    if (!loginDetails) return;
    const subject = encodeURIComponent('Excellence Online College – Student Portal Login Details');
    const body = encodeURIComponent(`Dear Student,

You have been successfully registered as a student at Excellence Online College.

Your Student Portal login details are:

Student Portal: ${window.location.origin}/student
Admission Number: ${loginDetails.admissionNumber}
Username: ${loginDetails.email}
Temporary Password: ${loginDetails.temporaryPassword}

Please log in to the Student Portal and change your password after your first login.

Regards,
Admissions Office
Excellence Online College`);
    window.open(`mailto:${loginDetails.email}?subject=${subject}&body=${body}`);
  }

  function formatPhoneForWhatsApp(phone: string): string {
    if (!phone) return '';
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with 254 (Kenya)
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    // If starts with +254, remove the +
    if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    }
    
    // If already starts with 254, use as is
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  function sendLoginDetailsWhatsApp() {
    if (!loginDetails) return;
    
    const formattedPhone = formatPhoneForWhatsApp(loginDetails.phone);
    if (!formattedPhone) {
      alert('No phone number available for this student.');
      return;
    }
    
    const message = `Hello ${loginDetails.firstName} ${loginDetails.lastName},

Your Excellence Online College Student Portal account has been created successfully.

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

  function closeModal() {
    setShowLoginModal(false);
    if (loginDetails) {
      router.push(`/dashboard/students/${loginDetails.studentId}`);
    }
  }

  const programOptions = [
    { value: '', label: 'Select program' },
    ...programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  ];

  const intakeOptions = [
    { value: '', label: 'Select intake' },
    ...intakes.map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` })),
  ];

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      {!student && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold">Step 1: Register in MIS</p>
              <p className="mt-1 text-blue-700">
                Admission number and student ID card are created automatically.
                If you register units, a fee invoice is generated and sent to the student portal.
                After registration, import the student to Moodle LMS.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input name="first_name" label="First name" defaultValue={student?.first_name} required />
          <Input name="last_name" label="Last name" defaultValue={student?.last_name} required />
          <Input name="email" label="Email" type="email" defaultValue={student?.email} required />
          <Input name="phone" label="Phone" defaultValue={student?.phone ?? ''} />
          <Input name="date_of_birth" label="Date of birth" type="date" defaultValue={student?.date_of_birth ?? ''} />
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-slate-700">Gender</label>
            <Select name="gender" id="gender" defaultValue={student?.gender ?? ''} options={genderOptions} />
          </div>
          <Input name="nationality" label="Nationality" defaultValue={student?.nationality ?? 'Kenyan'} />
          <div className="sm:col-span-2">
            <PassportPhotoUpload
              existingPhotoUrl={student?.photo_url}
              onPreviewChange={setPhotoPreviewUrl}
              onFileChange={setSelectedPhotoFile}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input name="address" label="Street address" defaultValue={student?.address ?? ''} />
          </div>
          <Input name="city" label="City" defaultValue={student?.city ?? ''} />
          <Input name="country" label="Country" defaultValue={student?.country ?? 'Kenya'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic & Emergency</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="program_id" className="block text-sm font-medium text-slate-700">Program</label>
            <Select
              name="program_id"
              id="program_id"
              value={programId}
              onChange={(value) => {
                setProgramId(value);
                setSemester(null);
                const modes = programs.find((item) => item.id === value)?.study_modes ?? [];
                setStudyMode((prev) =>
                  prev && modes.includes(prev) ? prev : modes.length === 1 ? modes[0] : ''
                );
              }}
              options={programOptions}
              required={!student}
              disabled={Boolean(student)}
            />
            {student ? (
              <p className="mt-1 text-xs text-slate-500">
                Programme changes must be made through{' '}
                <Link
                  href={`/dashboard/students/programme-enrollment?studentId=${student.id}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  Programme Enrollment
                </Link>{' '}
                so the admission number and history stay correct.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                The admission number is generated from the programme&apos;s configured format.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="intake_id" className="block text-sm font-medium text-slate-700">Intake</label>
            <Select
              name="intake_id"
              id="intake_id"
              defaultValue={student?.intake_id ?? ''}
              options={intakeOptions}
            />
          </div>
          {!student && (
            <div>
              <label htmlFor="study_mode" className="block text-sm font-medium text-slate-700">
                Study mode
              </label>
              {studyModeOptions.length > 0 ? (
                <Select
                  name="study_mode"
                  id="study_mode"
                  value={studyMode}
                  options={[
                    { value: '', label: 'Select study mode' },
                    ...studyModeOptions.map((mode) => ({
                      value: mode,
                      label: mode.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
                    })),
                  ]}
                  onChange={setStudyMode}
                  required
                />
              ) : (
                <Input
                  name="study_mode"
                  id="study_mode"
                  value={studyMode}
                  onChange={(e) => setStudyMode(e.target.value)}
                  placeholder="e.g. Full-time"
                />
              )}
              <p className="mt-1 text-xs text-slate-500">
                Study modes come from the programme configuration.
              </p>
            </div>
          )}
          <Input name="enrollment_date" label="Enrollment date" type="date" defaultValue={student?.enrollment_date ?? new Date().toISOString().split('T')[0]} />
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
            <Select name="status" id="status" defaultValue={student?.status ?? 'active'} options={statusOptions} />
            {student && (
              <p className="mt-1 text-xs text-slate-500">
                Setting status to Withdrawn, Inactive, or Suspended deregisters open units, adjusts
                unpaid fee invoices, rejects pending payments, and blocks new student payments.
                Fees already paid are kept on record.
              </p>
            )}
          </div>
          <Input name="emergency_contact_name" label="Emergency contact name" defaultValue={student?.emergency_contact_name ?? ''} />
          <Input name="emergency_contact_phone" label="Emergency contact phone" defaultValue={student?.emergency_contact_phone ?? ''} />
          <div className="sm:col-span-2">
            <Textarea name="notes" label="Notes" rows={3} defaultValue={student?.notes ?? ''} />
          </div>

          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Unit registration</p>
                <p className="mt-1 text-xs text-slate-600">
                  Units come from the programme curriculum for the selected semester.
                </p>
                {curriculumName && (
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    Curriculum: {curriculumName}
                  </p>
                )}
              </div>
              {!termId && (
                <span className="text-xs text-amber-700">No current term set</span>
              )}
            </div>

            {!programId ? (
              <p className="mt-3 text-sm text-slate-600">Select a program to see its curriculum units.</p>
            ) : coursesLoading ? (
              <p className="mt-3 text-sm text-slate-600">Loading units…</p>
            ) : coursesError ? (
              <p className="mt-3 text-sm text-red-600">{coursesError}</p>
            ) : (
              <>
                {semesters.length > 0 && (
                  <div className="mt-3 max-w-xs">
                    <label htmlFor="semester" className="block text-xs font-medium text-slate-700">
                      Semester
                    </label>
                    <Select
                      id="semester"
                      value={String(semester ?? '')}
                      options={semesters.map((value) => ({
                        value: String(value),
                        label: `Semester ${value}`,
                      }))}
                      onChange={(value) => {
                        const next = Number(value);
                        setSemester(next);
                        setSelectedCourseIds([]);
                        void loadUnits(next);
                      }}
                    />
                  </div>
                )}

                {availableCourses.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    No active units are configured for this semester in the programme curriculum.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {availableCourses.map((c) => {
                      const checked = selectedSet.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-slate-300"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedCourseIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(c.id);
                                else next.delete(c.id);
                                return Array.from(next);
                              });
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {c.code}
                              <span className="font-normal text-slate-500"> — {c.name}</span>
                            </p>
                            <p className="text-xs text-slate-500">{formatCurrency(c.unit_fee ?? 0)}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          <UserPlus className="h-4 w-4" />
          {loading ? 'Registering...' : student ? 'Update Student' : 'Register Student'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>

    {/* Login Details Modal */}
    <Modal
      open={showLoginModal}
      onClose={closeModal}
      title="Student Registered Successfully"
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
          <Button onClick={sendLoginDetailsWhatsApp} variant="secondary" className="flex-1">
            <MessageCircle className="h-4 w-4 mr-2" />
            Send via WhatsApp
          </Button>
          <Button onClick={sendLoginDetailsEmail} variant="secondary" className="flex-1">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button onClick={closeModal} className="flex-1">
            Done
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Please share these login details securely with the student. They should change their password after first login.
        </p>
      </div>
    </Modal>
  </>
  );
}
