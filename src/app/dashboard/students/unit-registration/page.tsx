import { PageHeader } from '@/components/ui/page-header';
import { UnitRegistrationClient } from '@/components/students/unit-registration-client';

export default async function UnitRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Unit Registration"
        description="Register a student's units from their programme curriculum, by semester and academic term. Units from other semesters and previous programmes are preserved."
      />
      <UnitRegistrationClient initialStudentId={studentId} />
    </div>
  );
}
