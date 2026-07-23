import { redirect } from 'next/navigation';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getEnrollmentsForStudent } from '@/app/actions/enrollments';
import { AdmissionLetter } from '@/components/students/admission-letter';

export default async function StudentAdmissionLetterPage() {
  const student = await getMyStudentRecord();

  if (!student) {
    redirect('/student/register');
  }

  const enrollments = await getEnrollmentsForStudent(student.id);

  return (
    <AdmissionLetter student={student} enrollments={enrollments} />
  );
}
