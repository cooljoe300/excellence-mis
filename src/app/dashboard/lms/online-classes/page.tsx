import { getPrograms } from '@/app/actions/programs';
import { AdminOnlineClassesClient } from '@/components/lms/admin-online-classes-client';

export default async function AdminOnlineClassesPage() {
  const programs = await getPrograms();
  return <AdminOnlineClassesClient programs={programs} />;
}
