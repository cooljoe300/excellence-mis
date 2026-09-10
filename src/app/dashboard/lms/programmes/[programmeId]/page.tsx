import { getPrograms } from '@/app/actions/programs';
import { getCourses } from '@/app/actions/courses';
import { notFound } from 'next/navigation';
import { LmsProgrammeUnitsClient } from '@/components/lms/lms-programme-units-client';

export default async function LmsProgrammeUnitsPage({
  params,
}: {
  params: Promise<{ programmeId: string }>;
}) {
  const { programmeId } = await params;
  const programs = await getPrograms();
  const program = programs.find((p) => p.id === programmeId);
  
  if (!program) {
    notFound();
  }

  const courses = await getCourses(programmeId);
  return <LmsProgrammeUnitsClient program={program} courses={courses} />;
}
