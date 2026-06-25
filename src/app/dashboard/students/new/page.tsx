import { PageHeader } from '@/components/ui/page-header';
import { StudentForm } from '@/components/students/student-form';
import { getPrograms } from '@/app/actions/programs';

export default async function NewStudentPage() {
  const programs = await getPrograms();

  return (
    <div>
      <PageHeader
        title="Register Student"
        description="Step 1 — Register in MIS. Admission number and ID card are created automatically."
      />
      <StudentForm programs={programs} />
    </div>
  );
}
