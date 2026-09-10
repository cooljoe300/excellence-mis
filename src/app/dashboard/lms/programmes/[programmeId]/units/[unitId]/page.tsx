import { getPrograms } from '@/app/actions/programs';
import { getCourses } from '@/app/actions/courses';
import { notFound } from 'next/navigation';
import { LmsUnitActivitiesClient } from '@/components/lms/lms-unit-activities-client';

export default async function LmsUnitActivitiesPage({
  params,
}: {
  params: Promise<{ programmeId: string; unitId: string }>;
}) {
  const { programmeId, unitId } = await params;
  const programs = await getPrograms();
  const program = programs.find((p) => p.id === programmeId);
  
  if (!program) {
    notFound();
  }

  const courses = await getCourses(programmeId);
  const course = courses.find((c) => c.id === unitId);
  
  if (!course) {
    notFound();
  }

  return <LmsUnitActivitiesClient program={program} course={course} />;
}
