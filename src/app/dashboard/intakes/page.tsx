import { getIntakes } from '@/app/actions/intakes';
import { IntakesClient } from '@/components/intakes/intakes-client';

export default async function IntakesPage() {
  const intakes = await getIntakes();
  return <IntakesClient intakes={intakes} />;
}
