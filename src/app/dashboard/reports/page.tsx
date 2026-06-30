import { PageHeader } from '@/components/ui/page-header';
import { getReportsBundle } from '@/app/actions/reports';
import { ReportsClient } from '@/components/reports/reports-client';

export default async function ReportsPage() {
  const data = await getReportsBundle();

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Select a report, apply filters, then save as PDF or export CSV"
      />
      <ReportsClient data={data} />
    </div>
  );
}
