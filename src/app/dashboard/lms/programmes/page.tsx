import { getPrograms } from '@/app/actions/programs';
import { LmsProgrammesClient } from '@/components/lms/lms-programmes-client';

export default async function LmsProgrammesPage() {
  const programs = await getPrograms();
  return <LmsProgrammesClient programs={programs} />;
}
