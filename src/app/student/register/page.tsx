import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPrograms } from '@/app/actions/programs';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { StudentSelfForm } from '@/components/students/student-self-form';
import { PageHeader } from '@/components/ui/page-header';

export default async function StudentRegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/student/signup');

  const [programs, existing] = await Promise.all([getPrograms(), getMyStudentRecord()]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={existing ? 'Update your details' : 'Register your details'}
        description="Fill in your details to complete student registration."
      />
      <StudentSelfForm programs={programs} existingStudent={existing ?? undefined} />
    </div>
  );
}

