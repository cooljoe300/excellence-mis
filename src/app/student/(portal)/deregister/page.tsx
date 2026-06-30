import { redirect } from 'next/navigation';
import { getMyDeregistrationPageData } from '@/app/actions/student-deregistration';
import { StudentDeregistrationForm } from '@/components/student/student-deregistration-form';
import { PageHeader } from '@/components/ui/page-header';

export default async function StudentDeregisterPage() {
  const data = await getMyDeregistrationPageData();
  if (!data) redirect('/student/register');

  return (
    <div>
      <PageHeader
        title="Request deregistration"
        description="Ask the college to remove units from your registration or withdraw from Excellence Online College"
      />
      <StudentDeregistrationForm
        student={data.student}
        enrolledUnits={data.enrolledUnits}
        requests={data.requests}
        setupRequired={data.setupRequired}
      />
    </div>
  );
}
