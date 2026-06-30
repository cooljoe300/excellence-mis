import { getEnrollments } from '@/app/actions/enrollments';
import { getPendingDeregistrationRequests } from '@/app/actions/student-deregistration';
import { getAcademicTerms } from '@/app/actions/academic-terms';
import { getStudents } from '@/app/actions/students';
import { getCourses } from '@/app/actions/courses';
import { EnrollmentsClient } from '@/components/enrollments/enrollments-client';

export default async function EnrollmentsPage() {
  const [enrollments, students, courses, terms, pendingDeregistrations] = await Promise.all([
    getEnrollments(),
    getStudents(),
    getCourses(),
    getAcademicTerms(),
    getPendingDeregistrationRequests(),
  ]);

  const courseMap = Object.fromEntries(
    courses.map((course) => [course.id, { code: course.code, name: course.name }])
  );

  return (
    <EnrollmentsClient
      enrollments={enrollments}
      students={students}
      courses={courses}
      terms={terms}
      pendingDeregistrations={pendingDeregistrations}
      deregistrationCourseMap={courseMap}
    />
  );
}
