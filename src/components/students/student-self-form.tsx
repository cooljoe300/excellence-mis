'use client';

import { useState } from 'react';
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
import { UserPlus, CreditCard } from 'lucide-react';

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

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

  const programOptions = [
    { value: '', label: 'Select program' },
    ...programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
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
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-medium">{success.message}</p>
          {success.admissionNumber && (
            <p className="mt-2 font-mono text-lg font-bold">{success.admissionNumber}</p>
          )}
          <p className="mt-2 text-emerald-700">Taking you to your portal...</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input name="first_name" label="First name" defaultValue={existingStudent?.first_name ?? defaultFirstName} required />
          <Input name="last_name" label="Last name" defaultValue={existingStudent?.last_name ?? defaultLastName} required />
          <Input name="phone" label="Phone" defaultValue={existingStudent?.phone ?? ''} />
          <Input name="date_of_birth" label="Date of birth" type="date" defaultValue={existingStudent?.date_of_birth ?? ''} />
          <Select name="gender" label="Gender" defaultValue={existingStudent?.gender ?? ''} options={genderOptions} />
          <Input name="nationality" label="Nationality" defaultValue={existingStudent?.nationality ?? 'Kenyan'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-700" />
            Passport Photo & ID Card
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm text-slate-600">
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
                className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline"
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

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input name="address" label="Street address" defaultValue={existingStudent?.address ?? ''} />
          </div>
          <Input name="city" label="City" defaultValue={existingStudent?.city ?? ''} />
          <Input name="country" label="Country" defaultValue={existingStudent?.country ?? 'Kenya'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academics & Emergency</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select
            name="program_id"
            label="Program"
            defaultValue={existingStudent?.program_id ?? ''}
            options={programOptions}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            required
          />
          <p className="sm:col-span-2 text-xs text-slate-500 -mt-2">
            Your admission number is generated from your program (e.g. EOC/CIFA/001/26).
          </p>
          <Input
            name="enrollment_date"
            label="Enrollment date"
            type="date"
            defaultValue={existingStudent?.enrollment_date ?? new Date().toISOString().split('T')[0]}
          />
          <Input name="emergency_contact_name" label="Emergency contact name" defaultValue={existingStudent?.emergency_contact_name ?? ''} />
          <Input name="emergency_contact_phone" label="Emergency contact phone" defaultValue={existingStudent?.emergency_contact_phone ?? ''} />
          <div className="sm:col-span-2">
            <Textarea name="notes" label="Notes (optional)" rows={3} defaultValue={existingStudent?.notes ?? ''} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          <UserPlus className="h-4 w-4" />
          {loading ? 'Saving...' : existingStudent ? 'Update details' : 'Register'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/student')}>
          Back
        </Button>
      </div>
    </form>
  );
}
