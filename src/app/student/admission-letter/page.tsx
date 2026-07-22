import { redirect } from 'next/navigation';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getEnrollmentsForStudent } from '@/app/actions/enrollments';
import { PageHeader } from '@/components/ui/page-header';
import { AdmissionLetter } from '@/components/students/admission-letter';

export default async function StudentAdmissionLetterPage() {
  const student = await getMyStudentRecord();

  if (!student) {
    redirect('/student/register');
  }

  const enrollments = await getEnrollmentsForStudent(student.id);

  return (
    <div>
      <PageHeader
        title="Admission Letter"
        description={`Official admission letter for ${student.first_name} ${student.last_name}`}
      />
      <AdmissionLetter student={student} enrollments={enrollments} />
    </div>
  );
}
