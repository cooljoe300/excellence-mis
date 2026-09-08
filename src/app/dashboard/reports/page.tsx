import { PageHeader } from '@/components/ui/page-header';
import { Alert } from '@/components/ui/alert';
import { ReportsClient } from '@/components/reports/reports-client';
import { ReportsRefreshButton } from '@/components/reports/reports-refresh-button';
import { getReportsBundle } from '@/app/actions/reports';

export default async function ReportsPage() {
  try {
    const data = await getReportsBundle();

    return (
      <div>
        <div className="no-print">
          <PageHeader
            title="Reports & Analytics"
            description="Generate, view, filter and export Excellence Online College reports."
          />
        </div>
        <ReportsClient data={data} />
      </div>
    );
  } catch {
    return (
      <div>
        <PageHeader
          title="Reports & Analytics"
          description="Generate, view, filter and export Excellence Online College reports."
        />
        <Alert variant="error">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Unable to load reports right now. Please try again.</p>
            <ReportsRefreshButton />
          </div>
        </Alert>
      </div>
    );
  }
}
