import { redirect } from 'next/navigation';
import { getMyFeesPageData } from '@/app/actions/student-fees';
import { StudentFeesClient } from '@/components/students/student-fees-client';
import { PageHeader } from '@/components/ui/page-header';

export default async function StudentFeesPage() {
  const data = await getMyFeesPageData();
  if (!data) redirect('/student/register');

  return (
    <div>
      <PageHeader
        title="Fees & Payments"
        description="View your invoices, pay via M-Pesa paybill or bank, and track your balance"
      />
      <StudentFeesClient
        student={data.student}
        fees={data.fees}
        paymentSettings={data.paymentSettings}
        totalDue={data.totalDue}
        totalPaid={data.totalPaid}
        totalBilled={data.totalBilled}
      />
    </div>
  );
}
