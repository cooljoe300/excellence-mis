import { getPrograms } from '@/app/actions/programs';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { StudentSelfForm } from '@/components/students/student-self-form';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export default async function StudentRegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [programs, existing] = await Promise.all([getPrograms(), getMyStudentRecord()]);

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single();

  const nameParts = (profile?.full_name ?? '').trim().split(/\s+/);
  const defaultFirstName = existing?.first_name ?? nameParts[0] ?? '';
  const defaultLastName = existing?.last_name ?? nameParts.slice(1).join(' ') ?? '';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={existing ? 'Update your details' : 'Register your details'}
        description="Fill in your details to complete student registration. Your admission number will be generated automatically."
      />
      <StudentSelfForm
        programs={programs}
        existingStudent={existing ?? undefined}
        defaultFirstName={defaultFirstName}
        defaultLastName={defaultLastName}
      />
    </div>
  );
}
