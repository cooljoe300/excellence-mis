import { getCourses } from '@/app/actions/courses';
import { getPrograms } from '@/app/actions/programs';
import { CoursesClient } from '@/components/courses/courses-client';

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>;
}) {
  const { program } = await searchParams;
  const [courses, programs] = await Promise.all([
    getCourses(program),
    getPrograms(),
  ]);
  return <CoursesClient courses={courses} programs={programs} />;
}
