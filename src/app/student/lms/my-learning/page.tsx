import { getMyStudentRecord } from '@/app/actions/student-self';
import { redirect } from 'next/navigation';
import { StudentMyLearningClient } from '@/components/lms/student-my-learning-client';

export default async function StudentMyLearningPage() {
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

  return <StudentMyLearningClient student={student} />;
}
