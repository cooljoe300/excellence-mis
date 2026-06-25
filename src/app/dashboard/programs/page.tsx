import { getPrograms } from '@/app/actions/programs';
import { ProgramsClient } from '@/components/programs/programs-client';

export default async function ProgramsPage() {
  const programs = await getPrograms();
  return <ProgramsClient programs={programs} />;
}
