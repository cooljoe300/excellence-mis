import { PageHeader } from '@/components/ui/page-header';
import { Alert } from '@/components/ui/alert';
import { ReportsClient } from '@/components/reports/reports-client';
import { ReportsRefreshButton } from '@/components/reports/reports-refresh-button';
import { CategoryOverview } from '@/components/reports/category-overview';
import { StudentReportsDashboard } from '@/components/reports/student-reports-dashboard';
import { AcademicReportsDashboard } from '@/components/reports/academic-reports-dashboard';
import { FinanceReportsDashboard } from '@/components/reports/finance-reports-dashboard';
import { AdministrativeReportsDashboard } from '@/components/reports/administrative-reports-dashboard';
import { getReportsBundle } from '@/app/actions/reports';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const report = typeof params.report === 'string' ? params.report : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;

  try {
    const data = await getReportsBundle();

    // If a specific report is requested, show the detailed report
    if (report) {
      return (
        <div>
          <div className="no-print">
            <PageHeader
              title="Reports & Analytics"
              description="Generate, view, filter and export Excellence Online College reports."
            />
          </div>
          <ReportsClient data={data} initialReport={report} initialCategory={category} />
        </div>
      );
    }

    // If a category is requested, show the category-specific dashboard
    if (category) {
      switch (category) {
        case 'student-reports':
          return (
            <div>
              <StudentReportsDashboard data={data} />
            </div>
          );
        case 'academic-reports':
          return (
            <div>
              <AcademicReportsDashboard data={data} />
            </div>
          );
        case 'finance-reports':
          return (
            <div>
              <FinanceReportsDashboard data={data} />
            </div>
          );
        case 'administrative-reports':
          return (
            <div>
              <AdministrativeReportsDashboard data={data} />
            </div>
          );
        default:
          return (
            <div>
              <CategoryOverview data={data} />
            </div>
          );
      }
    }

    // Default: show category overview
    return (
      <div>
        <CategoryOverview data={data} />
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
