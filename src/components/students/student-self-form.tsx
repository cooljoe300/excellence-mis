'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Program, Student } from '@/lib/types';
import { createMyStudentRecord, updateMyStudentRecord } from '@/app/actions/student-self';
import { UserPlus } from 'lucide-react';

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function StudentSelfForm({
  programs,
  existingStudent,
}: {
  programs: Program[];
  existingStudent?: Student;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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

    setSuccess('Saved successfully.');
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success} You can now wait for the admin to review and push your record to the LMS.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input name="first_name" label="First name" defaultValue={existingStudent?.first_name} required />
          <Input name="last_name" label="Last name" defaultValue={existingStudent?.last_name} required />
          <Input name="phone" label="Phone" defaultValue={existingStudent?.phone ?? ''} />
          <Input name="date_of_birth" label="Date of birth" type="date" defaultValue={existingStudent?.date_of_birth ?? ''} />
          <Select name="gender" label="Gender" defaultValue={existingStudent?.gender ?? ''} options={genderOptions} />
          <Input name="nationality" label="Nationality" defaultValue={existingStudent?.nationality ?? 'Kenyan'} />
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
          <Select name="program_id" label="Program" defaultValue={existingStudent?.program_id ?? ''} options={programOptions} />
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
        <Button type="button" variant="secondary" onClick={() => router.push('/login')}>
          Back
        </Button>
      </div>
    </form>
  );
}

