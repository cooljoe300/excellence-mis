import { PageHeader } from '@/components/ui/page-header';
import { getReportsBundle } from '@/app/actions/reports';
import { ReportsClient } from '@/components/reports/reports-client';

export default async function ReportsPage() {
  const data = await getReportsBundle();

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Institutional analytics — preview summaries and download CSV reports"
      />
      <ReportsClient data={data} />
    </div>
  );
}
