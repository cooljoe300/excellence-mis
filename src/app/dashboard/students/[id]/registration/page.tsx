import { notFound } from 'next/navigation';
import { getStudent } from '@/app/actions/students';
import { AdminCourseRegistration } from '@/components/students/admin-course-registration';

export default async function StudentRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let student;
  try {
    student = await getStudent(id);
  } catch {
    notFound();
  }

  return <AdminCourseRegistration student={student} />;
}
