import { getMyStudentRecord } from '@/app/actions/student-self';
import { redirect } from 'next/navigation';
import { getCourses } from '@/app/actions/courses';
import { StudentUnitActivitiesClient } from '@/components/lms/student-unit-activities-client';

export default async function StudentUnitActivitiesPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

  const courses = await getCourses();
  const course = courses.find((c) => c.id === unitId);
  
  if (!course) {
    redirect('/student/lms/my-learning');
  }

  return <StudentUnitActivitiesClient student={student} course={course} />;
}
