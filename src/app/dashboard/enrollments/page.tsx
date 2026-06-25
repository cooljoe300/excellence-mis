import { getEnrollments, getAcademicTerms } from '@/app/actions/enrollments';
import { getStudents } from '@/app/actions/students';
import { getCourses } from '@/app/actions/courses';
import { EnrollmentsClient } from '@/components/enrollments/enrollments-client';

export default async function EnrollmentsPage() {
  const [enrollments, students, courses, terms] = await Promise.all([
    getEnrollments(),
    getStudents(),
    getCourses(),
    getAcademicTerms(),
  ]);

  return (
    <EnrollmentsClient
      enrollments={enrollments}
      students={students}
      courses={courses}
      terms={terms}
    />
  );
}
