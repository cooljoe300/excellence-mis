'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Program, Student } from '@/lib/types';
import { createMyStudentRecord, updateMyStudentRecord, updateAcademicInfo } from '@/app/actions/student-self';
import {
  PassportPhotoUpload,
  StudentIdCardPreview,
} from '@/components/students/student-id-card-preview';
import { UserPlus, CreditCard, User, FileText, GraduationCap, CheckCircle2, ChevronRight, ChevronLeft, BookOpen, Wallet } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const STEPS = [
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'academics', label: 'Academics', icon: GraduationCap },
  { id: 'fees', label: 'Pay Fees', icon: Wallet },
  { id: 'idcard', label: 'ID Card', icon: CreditCard },
  { id: 'review', label: 'Review & Submit', icon: FileText },
] as const;

export function StudentSelfForm({
  programs,
  academicTerms,
  existingStudent,
  defaultFirstName,
  defaultLastName,
}: {
  programs: Program[];
  academicTerms?: any[];
  existingStudent?: Student;
  defaultFirstName?: string;
  defaultLastName?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ message: string; admissionNumber?: string } | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState(existingStudent?.program_id ?? '');
  const [selectedStudyMode, setSelectedStudyMode] = useState(existingStudent?.study_mode ?? '');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [availableUnits, setAvailableUnits] = useState<{ id: string; code: string; name: string; unit_fee: number; credits: number; isEnrolled: boolean }[]>([]);
  const [existingEnrollments, setExistingEnrollments] = useState<any[]>([]);
  const [termId, setTermId] = useState<string | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [curriculumName, setCurriculumName] = useState<string | null>(null);
  const [unitsSemester, setUnitsSemester] = useState<number | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [studentCreated, setStudentCreated] = useState(false);
  const [enrollmentCompleted, setEnrollmentCompleted] = useState(false);
  const [feesData, setFeesData] = useState<any>(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<Record<string, string>>({});
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);

  const currentStepId = STEPS[currentStep].id;
  const studyModeOptions = programs.find((program) => program.id === selectedProgramId)?.study_modes ?? [];

  // Sync selectedProgramId with existing student's program
  useEffect(() => {
    if (existingStudent?.program_id && !selectedProgramId) {
      setSelectedProgramId(existingStudent.program_id);
    }
  }, [existingStudent?.program_id, selectedProgramId]);

  // Load available units when program is selected
  async function loadUnitsForProgram(programId: string, termId?: string) {
    if (!programId) {
      setAvailableUnits([]);
      setSelectedUnitIds([]);
      setExistingEnrollments([]);
      setCurriculumName(null);
      setUnitsSemester(null);
      setUnitsError(null);
      return;
    }
    
    setLoadingUnits(true);
    setUnitsError(null);
    try {
      const response = await fetch('/api/enrollments/program-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, termId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableUnits(data.units || []);
        setTermId(data.termId || null);
        setSelectedUnitIds([]);
        setCurriculumName(data.curriculumName ?? null);
        setUnitsSemester(data.semester ?? null);
        setUnitsError(data.error ?? null);
        
        // Track which units are already enrolled
        const enrolledUnits = (data.units || []).filter((u: any) => u.isEnrolled);
        setExistingEnrollments(enrolledUnits);
      } else {
        const data = await response.json().catch(() => null);
        setUnitsError(data?.error || 'Failed to load curriculum units.');
      }
    } catch (error) {
      console.error('Failed to load units:', error);
      setUnitsError('Failed to load curriculum units.');
    } finally {
      setLoadingUnits(false);
    }
  }

  // Load units when program or term changes
  useEffect(() => {
    if (selectedProgramId && selectedTermId && currentStepId === 'academics') {
      loadUnitsForProgram(selectedProgramId, selectedTermId);
    }
  }, [selectedProgramId, selectedTermId, currentStepId]);

  const programOptions = [
    { value: '', label: 'Select program' },
    ...programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  ];

  const termOptions = [
    { value: '', label: 'Select semester' },
    ...(academicTerms || []).map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
  ];

  function validateCurrentStep() {
    if (!formRef.current) return false;
    const formData = new FormData(formRef.current);
    
    if (currentStepId === 'personal') {
      if (!formData.get('first_name') || !formData.get('last_name')) {
        setError('First name and last name are required.');
        return false;
      }
    }
    
    if (currentStepId === 'academics') {
      const formProgramId = formData.get('program_id') as string;
      const existingProgramId = existingStudent?.program_id;
      const formTermId = formData.get('term_id') as string;
      
      // Use existing program_id if available, otherwise check form selection or state
      const hasProgram = formProgramId || existingProgramId || selectedProgramId;
      
      if (!hasProgram) {
        setError('Please select a program.');
        return false;
      }

      if (!formTermId && !selectedTermId) {
        setError('Please select a semester.');
        return false;
      }
      
      // Only require unit selection when moving to Fees step (since fees depend on enrollments)
      const nextStepId = STEPS[currentStep + 1]?.id;
      if (nextStepId === 'fees') {
        const hasNewUnits = selectedUnitIds.length > 0;
        const hasExistingUnits = existingEnrollments.length > 0;
        
        if (!hasNewUnits && !hasExistingUnits) {
          setError('Please select at least one unit to enroll before proceeding to fees.');
          return false;
        }
      }
    }

    if (currentStepId === 'fees') {
      // Allow access to fees if student exists and has either new or existing enrollments
      if (!existingStudent?.id && !studentCreated) {
        setError('Please complete registration before paying fees.');
        return false;
      }
    }
    
    setError(null);
    return true;
  }

  async function handleNext() {
    if (!validateCurrentStep()) return;

    setLoading(true);
    setError(null);

    try {
      // Save personal information when moving from personal to academics
      // But do NOT create the student record yet - defer until program is selected
      if (currentStepId === 'personal') {
        if (existingStudent?.id) {
          // Update existing student's personal info
          if (!formRef.current) return;
          const formData = new FormData(formRef.current);

          const result = await updateMyStudentRecord(existingStudent.id, formData);

          if (result?.error) {
            setError(result.error);
            setLoading(false);
            return;
          }
        } else {
          // For new students, save personal info to state for later
          if (!formRef.current) return;
          const formData = new FormData(formRef.current);
          const info: Record<string, string> = {};
          formData.forEach((value, key) => {
            if (typeof value === 'string') {
              info[key] = value;
            }
          });
          setPersonalInfo(info);
        }
        // Move to the next step without creating the record yet
      }

      // When moving from academics to fees, create/update student record and enroll units
      if (currentStepId === 'academics') {
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);

        // For existing students, update academic info only
        if (existingStudent?.id) {
          const academicResult = await updateAcademicInfo(existingStudent.id, formData);

          if (academicResult?.error) {
            setError(academicResult.error);
            setLoading(false);
            return;
          }
        } else {
          // For new students, merge saved personal info with current form data
          // and create the student record now that program_id is available
          const mergedFormData = new FormData();

          // Add saved personal info
          Object.entries(personalInfo).forEach(([key, value]) => {
            mergedFormData.append(key, value);
          });

          // Add current form data (academic info)
          formData.forEach((value, key) => {
            mergedFormData.append(key, value);
          });

          const createResult = await createMyStudentRecord(mergedFormData);

          console.log('createMyStudentRecord result:', createResult);

          if ('error' in createResult && createResult.error) {
            setError(createResult.error);
            setLoading(false);
            return;
          }

          const newStudentId = 'id' in createResult ? createResult.id : undefined;
          console.log('Extracted student ID from result:', newStudentId);

          if (newStudentId) {
            setStudentCreated(true);
            setCreatedStudentId(newStudentId);
            console.log('Student created with ID:', newStudentId);
          } else {
            console.error('createMyStudentRecord did not return an ID:', createResult);
          }
        }

        // Then handle unit enrollment (doesn't touch student record)
        if (selectedUnitIds.length > 0) {
          await enrollUnits();
          if (!enrollmentCompleted) {
            setLoading(false);
            return; // Enrollment failed
          }
        } else if (existingEnrollments.length > 0) {
          // Student has existing enrollments, mark as complete
          setEnrollmentCompleted(true);
        }
      }

      // When moving from ID Card to Review, upload the photo if one was selected
      if (currentStepId === 'idcard' && selectedPhotoFile) {
        try {
          const formData = new FormData();
          console.log('Appending photo file for student:', selectedPhotoFile.name, selectedPhotoFile.size);
          formData.append('photo', selectedPhotoFile);

          // For existing students, update their record
          if (existingStudent?.id) {
            console.log('Uploading photo for existing student:', existingStudent.id);
            const result = await updateMyStudentRecord(existingStudent.id, formData);
            console.log('Photo upload result (existing student):', result);

            if (result?.error) {
              console.error('Photo upload error:', result.error);
              console.warn('Photo upload failed, but continuing with registration:', result.error);
            } else {
              console.log('Photo uploaded successfully for existing student');
            }
          }
          // For new students, upload photo after student creation
          else if (studentCreated && createdStudentId) {
            console.log('Uploading photo for newly created student ID:', createdStudentId);
            const result = await updateMyStudentRecord(createdStudentId, formData);
            console.log('Photo upload result (new student):', result);

            if (result?.error) {
              console.error('Photo upload error:', result.error);
              console.warn('Photo upload failed, but continuing with registration:', result.error);
            } else {
              console.log('Photo uploaded successfully for new student');
              // Refresh the student data to get the updated photo_url
              router.refresh();
            }
          }

          // Clear the file after upload attempt
          setSelectedPhotoFile(null);
        } catch (photoError) {
          console.error('Photo upload exception:', photoError);
          console.warn('Photo upload failed with exception, but continuing with registration:', photoError);
          setSelectedPhotoFile(null);
        }
      }

      // Load fees data when entering fees step
      if (currentStepId === 'academics' && STEPS[currentStep + 1].id === 'fees') {
        await loadFeesData();
      }

      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setError('Unable to save your information. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function enrollUnits() {
    if (selectedUnitIds.length === 0) {
      setEnrollmentCompleted(true);
      return;
    }
    
    try {
      const enrollResponse = await fetch('/api/enrollments/enroll-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitIds: selectedUnitIds, termId: selectedTermId || termId }),
      });
      
      if (!enrollResponse.ok) {
        const errorData = await enrollResponse.json();
        setError(errorData.error || 'Failed to enroll in units.');
        return;
      }
      setEnrollmentCompleted(true);
    } catch (error) {
      setError('Failed to enroll in units. Please try again.');
    }
  }

  async function createStudentAndEnroll() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    
    const firstName = formData.get('first_name') as string || existingStudent?.first_name || defaultFirstName;
    const lastName = formData.get('last_name') as string || existingStudent?.last_name || defaultLastName;
    const formProgramId = formData.get('program_id') as string;
    const programId = formProgramId || selectedProgramId || existingStudent?.program_id;
    
    if (!firstName || !lastName) {
      setError('First name and last name are required.');
      return;
    }
    
    if (!programId) {
      setError('Please select a program.');
      return;
    }
    
    if (selectedUnitIds.length === 0) {
      setError('Please select at least one unit to enroll.');
      return;
    }
    
    // Ensure form data has the required values
    if (!formData.get('first_name')) formData.set('first_name', firstName);
    if (!formData.get('last_name')) formData.set('last_name', lastName);
    if (!formData.get('program_id') && programId) formData.set('program_id', programId);
    
    setLoading(true);
    setError(null);

    const result = existingStudent?.id
      ? await updateMyStudentRecord(existingStudent.id, formData)
      : await createMyStudentRecord(formData);

    if ('error' in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Enroll in selected units
    const studentId = existingStudent?.id || ('id' in result ? result.id : undefined);
    if (studentId && selectedUnitIds.length > 0) {
      try {
        const enrollResponse = await fetch('/api/enrollments/enroll-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitIds: selectedUnitIds }),
        });
        
        if (!enrollResponse.ok) {
          const errorData = await enrollResponse.json();
          setError(errorData.error || 'Failed to enroll in units.');
          setLoading(false);
          return;
        }
        setEnrollmentCompleted(true);
      } catch (error) {
        setError('Failed to enroll in units. Please try again.');
        setLoading(false);
        return;
      }
    }

    setStudentCreated(true);
    setLoading(false);
  }

  async function loadFeesData() {
    setLoadingFees(true);
    try {
      const response = await fetch('/api/student/fees-data');
      if (response.ok) {
        const data = await response.json();
        setFeesData(data);
      }
    } catch (error) {
      console.error('Failed to load fees:', error);
    } finally {
      setLoadingFees(false);
    }
  }

  function handlePrevious() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleStepClick(index: number) {
    if (completedSteps.has(index) || index < currentStep) {
      setCurrentStep(index);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // For existing students, just update details
    if (existingStudent?.id) {
      if (!formRef.current) return;
      const formData = new FormData(formRef.current);
      setLoading(true);
      setError(null);

      // Append the selected photo file if one was chosen
      if (selectedPhotoFile) {
        console.log('Appending photo file in handleSubmit:', selectedPhotoFile.name, selectedPhotoFile.size);
        formData.append('photo', selectedPhotoFile);
      } else {
        console.log('No photo file in handleSubmit');
      }

      const result = await updateMyStudentRecord(existingStudent.id, formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setSuccess({ message: 'Your details have been updated.' });
      setLoading(false);
      router.refresh();
      return;
    }

    // For new students, redirect to admission complete after all steps
    router.replace('/student/admission-complete');
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
          <p className="font-medium">{success.message}</p>
          {success.admissionNumber && (
            <p className="mt-2 font-mono text-sm font-bold">{success.admissionNumber}</p>
          )}
          <p className="mt-2 text-emerald-700">Taking you to your portal...</p>
        </div>
      )}

      {/* Horizontal Navigation */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 py-3 print:hidden">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = completedSteps.has(index);
            const isClickable = isCompleted || index < currentStep;
            const Icon = step.icon;
            
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                  isActive && 'bg-blue-50 text-blue-700 border border-blue-200',
                  isCompleted && !isActive && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  !isClickable && 'text-slate-400 cursor-not-allowed',
                  isClickable && !isActive && 'hover:bg-slate-50 text-slate-600 border border-transparent'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className={cn('h-4 w-4', isActive ? 'text-blue-700' : 'text-slate-400')} />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {currentStepId === 'personal' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-700" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input name="first_name" label="First name" defaultValue={personalInfo.first_name ?? existingStudent?.first_name ?? defaultFirstName} required completed={!!(personalInfo.first_name || existingStudent?.first_name)} />
            <Input name="last_name" label="Last name" defaultValue={personalInfo.last_name ?? existingStudent?.last_name ?? defaultLastName} required completed={!!(personalInfo.last_name || existingStudent?.last_name)} />
            <Input name="phone" label="Phone" defaultValue={personalInfo.phone ?? existingStudent?.phone ?? ''} completed={!!(personalInfo.phone || existingStudent?.phone)} />
            <Input name="date_of_birth" label="Date of birth" type="date" defaultValue={personalInfo.date_of_birth ?? existingStudent?.date_of_birth ?? ''} completed={!!(personalInfo.date_of_birth || existingStudent?.date_of_birth)} />
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-slate-700">Gender</label>
              <Select name="gender" id="gender" defaultValue={personalInfo.gender ?? existingStudent?.gender ?? ''} options={genderOptions} completed={!!(personalInfo.gender || existingStudent?.gender)} />
            </div>
            <Input name="nationality" label="Nationality" defaultValue={personalInfo.nationality ?? existingStudent?.nationality ?? 'Kenyan'} completed={!!(personalInfo.nationality || existingStudent?.nationality)} />
            <div className="sm:col-span-2">
              <Input name="address" label="Street address" defaultValue={personalInfo.address ?? existingStudent?.address ?? ''} completed={!!(personalInfo.address || existingStudent?.address)} />
            </div>
            <Input name="city" label="City" defaultValue={personalInfo.city ?? existingStudent?.city ?? ''} completed={!!(personalInfo.city || existingStudent?.city)} />
            <Input name="country" label="Country" defaultValue={personalInfo.country ?? existingStudent?.country ?? 'Kenyan'} completed={!!(personalInfo.country || existingStudent?.country)} />
            <Input name="emergency_contact_name" label="Emergency contact name" defaultValue={personalInfo.emergency_contact_name ?? existingStudent?.emergency_contact_name ?? ''} completed={!!(personalInfo.emergency_contact_name || existingStudent?.emergency_contact_name)} />
            <Input name="emergency_contact_phone" label="Emergency contact phone" defaultValue={personalInfo.emergency_contact_phone ?? existingStudent?.emergency_contact_phone ?? ''} completed={!!(personalInfo.emergency_contact_phone || existingStudent?.emergency_contact_phone)} />
          </CardContent>
        </Card>
      )}

      {currentStepId === 'idcard' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-700" />
              Passport Photo & ID Card
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs text-slate-600">
                Upload a passport-style photo for your student ID card. You can update it any time
                from this page.
              </p>
              <PassportPhotoUpload
                existingPhotoUrl={existingStudent?.photo_url}
                onPreviewChange={setPhotoPreviewUrl}
                onFileChange={setSelectedPhotoFile}
              />
              {existingStudent?.id && (
                <Link
                  href="/student/id-card"
                  target="_blank"
                  className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline"
                >
                  View full ID card →
                </Link>
              )}
            </div>
            <StudentIdCardPreview
              student={existingStudent}
              photoPreviewUrl={photoPreviewUrl}
              programs={programs}
              programId={selectedProgramId}
            />
          </CardContent>
        </Card>
      )}

      {currentStepId === 'academics' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-700" />
              Academics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingStudent?.admission_number && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Admission Number</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Already Assigned
                  </span>
                </div>
                <p className="mt-1 text-sm font-mono font-bold text-emerald-700">{existingStudent.admission_number}</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="program_id" className="block text-sm font-medium text-slate-700">Program</label>
                <Select
                  name="program_id"
                  id="program_id"
                  defaultValue={existingStudent?.program_id ?? ''}
                  options={programOptions}
                  onChange={(value) => {
                    setSelectedProgramId(value);
                    const modes =
                      programs.find((program) => program.id === value)?.study_modes ?? [];
                    setSelectedStudyMode((prev) =>
                      prev && modes.includes(prev) ? prev : modes.length === 1 ? modes[0] : ''
                    );
                  }}
                  required
                  disabled={!!existingStudent?.program_id}
                  completed={!!existingStudent?.program_id}
                />
              </div>
              {/* Hidden input to ensure program_id is submitted when field is disabled */}
              {existingStudent?.program_id && (
                <input type="hidden" name="program_id" value={existingStudent.program_id} />
              )}
              <div>
                <label htmlFor="term_id" className="block text-sm font-medium text-slate-700">Semester</label>
                <Select
                  name="term_id"
                  id="term_id"
                  value={selectedTermId}
                  onChange={(value) => setSelectedTermId(value)}
                  options={termOptions}
                  required
                  completed={!!selectedTermId}
                />
              </div>
              {!existingStudent && studyModeOptions.length > 0 && (
                <div>
                  <label htmlFor="study_mode" className="block text-sm font-medium text-slate-700">
                    Study mode
                  </label>
                  <Select
                    name="study_mode"
                    id="study_mode"
                    value={selectedStudyMode}
                    options={[
                      { value: '', label: 'Select study mode' },
                      ...studyModeOptions.map((mode) => ({
                        value: mode,
                        label: mode.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
                      })),
                    ]}
                    onChange={(value) => setSelectedStudyMode(value)}
                    required
                    completed={!!selectedStudyMode}
                  />
                </div>
              )}
              <p className="sm:col-span-2 text-[11px] text-slate-500 -mt-2">
                Your admission number is generated automatically from the selected programme&apos;s
                admission-number configuration.
              </p>
              <Input
                name="enrollment_date"
                label="Enrollment date"
                type="date"
                defaultValue={existingStudent?.enrollment_date ?? new Date().toISOString().split('T')[0]}
                completed={!!existingStudent?.enrollment_date}
              />
              <div className="sm:col-span-2">
                <Textarea name="notes" label="Notes (optional)" rows={3} defaultValue={existingStudent?.notes ?? ''} />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-700" />
                Unit Registration
              </h3>
              {(curriculumName || unitsSemester) && (
                <p className="mb-2 text-[11px] font-medium text-slate-600">
                  {curriculumName ? `Curriculum: ${curriculumName}` : ''}
                  {curriculumName && unitsSemester ? ' · ' : ''}
                  {unitsSemester ? `Semester ${unitsSemester}` : ''}
                </p>
              )}
              {unitsError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {unitsError}
                </div>
              ) : loadingUnits ? (
                <p className="text-xs text-slate-500">Loading available units...</p>
              ) : availableUnits.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {selectedProgramId ? 'No units are configured for this programme curriculum yet.' : 'Please select a program above to see available units.'}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600">
                    Select the units you want to enroll in. Each unit has its own fee.
                  </p>
                  <div className="space-y-1">
                    {availableUnits.map((unit) => {
                      const checked = selectedUnitIds.includes(unit.id);
                      const isEnrolled = unit.isEnrolled;
                      return (
                        <label
                          key={unit.id}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
                            isEnrolled
                              ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                              : 'border-slate-200 bg-white cursor-pointer hover:border-blue-200 hover:bg-blue-50/30'
                          )}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                              checked={checked}
                              disabled={isEnrolled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUnitIds(prev => [...prev, unit.id]);
                                } else {
                                  setSelectedUnitIds(prev => prev.filter(id => id !== unit.id));
                                }
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 leading-tight">
                                {unit.code}
                                <span className="font-normal text-slate-500"> — {unit.name}</span>
                              </p>
                              <p className="text-[11px] text-slate-500">{unit.credits} credits</p>
                              {isEnrolled && (
                                <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                                  ✓ Already Registered
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-slate-900">
                            {formatCurrency(unit.unit_fee)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedUnitIds.length > 0 && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2">
                      <div className="flex justify-between text-xs font-bold text-slate-900">
                        <span>Selected Units Total</span>
                        <span className="text-blue-700">
                          {formatCurrency(
                            availableUnits
                              .filter(u => selectedUnitIds.includes(u.id))
                              .reduce((sum, u) => sum + u.unit_fee, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStepId === 'fees' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-700" />
              Pay Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!studentCreated ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-semibold">Complete registration first</p>
                <p className="mt-1">
                  Please complete the previous steps (Personal Information, Academics) before proceeding to payment.
                </p>
              </div>
            ) : loadingFees ? (
              <p className="text-xs text-slate-500">Loading fee information...</p>
            ) : feesData ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold text-slate-900 mb-2">Student Information</h3>
                  <div className="grid gap-1 text-xs text-slate-600">
                    <p><span className="font-medium">Name:</span> {existingStudent?.first_name ?? defaultFirstName} {existingStudent?.last_name ?? defaultLastName}</p>
                    <p><span className="font-medium">Program:</span> {programs.find(p => p.id === selectedProgramId)?.name || 'Not selected'}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold text-slate-900 mb-2">Fee Summary</h3>
                  <div className="space-y-1 text-xs text-slate-600">
                    {feesData.fees?.map((fee: any) => (
                      <div key={fee.id} className="flex justify-between">
                        <span>{fee.description || fee.category || 'Fee'}</span>
                        <span className="font-medium">{formatCurrency(fee.amount || 0)}</span>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total</span>
                      <span>{formatCurrency(feesData.totalDue || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <h3 className="text-xs font-semibold text-slate-900 mb-2">Payment Status</h3>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Amount Paid</span>
                      <span className="font-medium">{formatCurrency(feesData.totalPaid || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outstanding Balance</span>
                      <span className="font-medium text-blue-700">{formatCurrency(feesData.totalDue || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700 shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-semibold">Registration Complete</p>
                    <p className="mt-1">
                      Your student record has been created and units enrolled. You can proceed to review or pay your fees now. Payment can also be done later from your student portal.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => router.push('/student/fees?from=registration')}
                  className="w-full"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Pay Fees Now
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-semibold">No fees generated yet</p>
                <p className="mt-1">
                  Fee information will be available after completing unit enrollment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStepId === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-700" />
              Review & Submit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2">Personal Information</h3>
              <div className="grid gap-1 text-xs text-slate-600">
                <p><span className="font-medium">Name:</span> {existingStudent?.first_name ?? defaultFirstName} {existingStudent?.last_name ?? defaultLastName}</p>
                <p><span className="font-medium">Phone:</span> {existingStudent?.phone || 'Not provided'}</p>
                <p><span className="font-medium">Date of Birth:</span> {existingStudent?.date_of_birth || 'Not provided'}</p>
                <p><span className="font-medium">Gender:</span> {existingStudent?.gender || 'Not provided'}</p>
                <p><span className="font-medium">Nationality:</span> {existingStudent?.nationality || 'Not provided'}</p>
                <p><span className="font-medium">Address:</span> {existingStudent?.address || 'Not provided'}</p>
                <p><span className="font-medium">City:</span> {existingStudent?.city || 'Not provided'}</p>
                <p><span className="font-medium">Country:</span> {existingStudent?.country || 'Not provided'}</p>
                <p><span className="font-medium">Emergency Contact:</span> {existingStudent?.emergency_contact_name || 'Not provided'} ({existingStudent?.emergency_contact_phone || 'Not provided'})</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2">Academics</h3>
              <div className="grid gap-1 text-xs text-slate-600">
                <p><span className="font-medium">Program:</span> {programs.find(p => p.id === selectedProgramId)?.name || 'Not selected'}</p>
                <p><span className="font-medium">Enrollment Date:</span> {existingStudent?.enrollment_date || new Date().toISOString().split('T')[0]}</p>
                <p><span className="font-medium">Notes:</span> {existingStudent?.notes || 'None'}</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2">Unit Enrollment</h3>
              <div className="text-xs text-slate-600">
                {selectedUnitIds.length === 0 ? (
                  <p>No units selected</p>
                ) : (
                  <div className="space-y-1">
                    {availableUnits
                      .filter(u => selectedUnitIds.includes(u.id))
                      .map(u => (
                        <p key={u.id}>
                          <span className="font-medium">{u.code}</span> — {u.name} ({formatCurrency(u.unit_fee)})
                        </p>
                      ))}
                    <p className="mt-2 pt-2 border-t border-slate-200 font-bold">
                      Total: {formatCurrency(
                        availableUnits
                          .filter(u => selectedUnitIds.includes(u.id))
                          .reduce((sum, u) => sum + u.unit_fee, 0)
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2">ID Card</h3>
              <div className="text-xs text-slate-600">
                <p>{existingStudent?.photo_url ? 'Passport photo uploaded' : 'No passport photo uploaded'}</p>
              </div>
            </div>

            {studentCreated && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <h3 className="text-xs font-semibold text-emerald-900 mb-2">Registration Status</h3>
                <div className="space-y-2 text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Student Registered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Enrollment Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Units Enrolled ({selectedUnitIds.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Fees Generated</span>
                  </div>
                  {feesData?.totalPaid > 0 && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Payment Recorded ({formatCurrency(feesData.totalPaid)})</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Review your information above. Click "Back" to make changes or "Finish Admission" to complete registration.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2 print:hidden">
        <Button
          type="button"
          variant="secondary"
          onClick={currentStepId === 'review' ? handlePrevious : () => router.push('/student')}
          disabled={currentStep === 0}
          size="sm"
        >
          {currentStepId === 'review' ? (
            <>
              <ChevronLeft className="h-4 w-4" />
              Back
            </>
          ) : (
            'Cancel'
          )}
        </Button>
        
        {currentStepId === 'review' ? (
          <Button type="submit" disabled={loading} size="sm">
            <UserPlus className="h-4 w-4" />
            {loading ? 'Saving...' : existingStudent ? 'Update details' : 'Register & Enroll'}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext} size="sm">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
