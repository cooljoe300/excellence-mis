import { PageHeader } from '@/components/ui/page-header';
import { StudentForm } from '@/components/students/student-form';
import { getPrograms } from '@/app/actions/programs';
import { getIntakes } from '@/app/actions/intakes';

export default async function NewStudentPage() {
  const [programs, intakes] = await Promise.all([getPrograms(), getIntakes()]);

  return (
    <div>
      <PageHeader
        title="Register Student"
        description="Step 1 — Register in MIS. Admission number and ID card are created automatically."
      />
      <StudentForm programs={programs} intakes={intakes} />
    </div>
  );
}
