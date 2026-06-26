import { redirect } from 'next/navigation';
import { getStudentRegisterPageData } from '@/app/actions/student-self';
import { StudentSelfForm } from '@/components/students/student-self-form';
import { PageHeader } from '@/components/ui/page-header';
import type { Program, Student } from '@/lib/types';

export default async function StudentRegisterPage() {
  const data = await getStudentRegisterPageData();
  if (!data) redirect('/student/signup');

  const { programs, existingStudent, defaultFirstName, defaultLastName } = data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={existingStudent ? 'Update your details' : 'Register your details'}
        description="Fill in your details to complete student registration. Your admission number will be generated automatically."
      />
      <StudentSelfForm
        programs={programs as Program[]}
        existingStudent={(existingStudent as Student | null) ?? undefined}
        defaultFirstName={defaultFirstName}
        defaultLastName={defaultLastName}
      />
    </div>
  );
}
