'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createStudent, updateStudent } from '@/app/actions/students';
import type { Program, Student } from '@/lib/types';
import { UserPlus, Info } from 'lucide-react';

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
  student,
}: {
  programs: Program[];
  student?: Student;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = student
      ? await updateStudent(student.id, formData)
      : await createStudent(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if ('id' in result && result.id) {
      router.push(`/dashboard/students/${result.id}?registered=true`);
    } else {
      router.push('/dashboard/students');
    }
    router.refresh();
  }

  const programOptions = [
    { value: '', label: 'Select program' },
    ...programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!student && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold">Step 1: Register in MIS</p>
              <p className="mt-1 text-blue-700">
                Admission number and student ID card are created automatically.
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
          <Select name="gender" label="Gender" defaultValue={student?.gender ?? ''} options={genderOptions} />
          <Input name="nationality" label="Nationality" defaultValue={student?.nationality ?? 'Kenyan'} />
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
          <Select name="program_id" label="Program" defaultValue={student?.program_id ?? ''} options={programOptions} />
          <Input name="enrollment_date" label="Enrollment date" type="date" defaultValue={student?.enrollment_date ?? new Date().toISOString().split('T')[0]} />
          <Select name="status" label="Status" defaultValue={student?.status ?? 'active'} options={statusOptions} />
          <Input name="emergency_contact_name" label="Emergency contact name" defaultValue={student?.emergency_contact_name ?? ''} />
          <Input name="emergency_contact_phone" label="Emergency contact phone" defaultValue={student?.emergency_contact_phone ?? ''} />
          <div className="sm:col-span-2">
            <Textarea name="notes" label="Notes" rows={3} defaultValue={student?.notes ?? ''} />
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
  );
}
