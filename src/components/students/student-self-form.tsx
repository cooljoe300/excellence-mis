'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Program, Student } from '@/lib/types';
import { createMyStudentRecord, updateMyStudentRecord } from '@/app/actions/student-self';
import {
  PassportPhotoUpload,
  StudentIdCardPreview,
} from '@/components/students/student-id-card-preview';
import { UserPlus, CreditCard, User, FileText, GraduationCap, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const STEPS = [
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'idcard', label: 'ID Card', icon: CreditCard },
  { id: 'academics', label: 'Academics', icon: GraduationCap },
  { id: 'review', label: 'Review & Submit', icon: FileText },
] as const;

export function StudentSelfForm({
  programs,
  existingStudent,
  defaultFirstName,
  defaultLastName,
}: {
  programs: Program[];
  existingStudent?: Student;
  defaultFirstName?: string;
  defaultLastName?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ message: string; admissionNumber?: string } | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState(existingStudent?.program_id ?? '');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  const currentStepId = STEPS[currentStep].id;

  const programOptions = [
    { value: '', label: 'Select program' },
    ...programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
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
      if (!formData.get('program_id')) {
        setError('Please select a program.');
        return false;
      }
    }
    
    setError(null);
    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
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
    
    // Final validation before submission
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    
    if (!formData.get('first_name') || !formData.get('last_name')) {
      setError('First name and last name are required.');
      return;
    }
    
    if (!formData.get('program_id')) {
      setError('Please select a program.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = existingStudent?.id
      ? await updateMyStudentRecord(existingStudent.id, formData)
      : await createMyStudentRecord(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (existingStudent?.id) {
      setSuccess({ message: 'Your details have been updated.' });
      setLoading(false);
      router.refresh();
      return;
    }

    const admissionNumber =
      'admissionNumber' in result && typeof result.admissionNumber === 'string'
        ? result.admissionNumber
        : undefined;

    setSuccess({
      message: 'Registration complete! Your admission number has been generated.',
      admissionNumber,
    });
    setLoading(false);
    router.replace('/student');
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
            <Input name="first_name" label="First name" defaultValue={existingStudent?.first_name ?? defaultFirstName} required />
            <Input name="last_name" label="Last name" defaultValue={existingStudent?.last_name ?? defaultLastName} required />
            <Input name="phone" label="Phone" defaultValue={existingStudent?.phone ?? ''} />
            <Input name="date_of_birth" label="Date of birth" type="date" defaultValue={existingStudent?.date_of_birth ?? ''} />
            <Select name="gender" label="Gender" defaultValue={existingStudent?.gender ?? ''} options={genderOptions} />
            <Input name="nationality" label="Nationality" defaultValue={existingStudent?.nationality ?? 'Kenyan'} />
            <div className="sm:col-span-2">
              <Input name="address" label="Street address" defaultValue={existingStudent?.address ?? ''} />
            </div>
            <Input name="city" label="City" defaultValue={existingStudent?.city ?? ''} />
            <Input name="country" label="Country" defaultValue={existingStudent?.country ?? 'Kenya'} />
            <Input name="emergency_contact_name" label="Emergency contact name" defaultValue={existingStudent?.emergency_contact_name ?? ''} />
            <Input name="emergency_contact_phone" label="Emergency contact phone" defaultValue={existingStudent?.emergency_contact_phone ?? ''} />
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
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Select
              name="program_id"
              label="Program"
              defaultValue={existingStudent?.program_id ?? ''}
              options={programOptions}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              required
            />
            <p className="sm:col-span-2 text-[11px] text-slate-500 -mt-2">
              Your admission number is generated from your program (e.g. EOC/CIFA/001/26).
            </p>
            <Input
              name="enrollment_date"
              label="Enrollment date"
              type="date"
              defaultValue={existingStudent?.enrollment_date ?? new Date().toISOString().split('T')[0]}
            />
            <div className="sm:col-span-2">
              <Textarea name="notes" label="Notes (optional)" rows={3} defaultValue={existingStudent?.notes ?? ''} />
            </div>
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
              <h3 className="text-xs font-semibold text-slate-900 mb-2">ID Card</h3>
              <div className="text-xs text-slate-600">
                <p>{existingStudent?.photo_url ? 'Passport photo uploaded' : 'No passport photo uploaded'}</p>
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
            <p className="text-[11px] text-slate-500">
              Review your information above. Click "Back" to make changes or "Submit" to complete registration.
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
            {loading ? 'Saving...' : existingStudent ? 'Update details' : 'Register'}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext} size="sm">
            {currentStepId === 'academics' ? 'Review' : 'Next'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
