import { PageHeader } from '@/components/ui/page-header';
import { ProgrammeEnrollmentClient } from '@/components/students/programme-enrollment-client';

export default async function ProgrammeEnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Programme Enrollment"
        description="Move a student to a different programme. Admission numbers are generated from the new programme's configuration, and the curriculum, semester and history are updated together."
      />
      <ProgrammeEnrollmentClient initialStudentId={studentId} />
    </div>
  );
}
