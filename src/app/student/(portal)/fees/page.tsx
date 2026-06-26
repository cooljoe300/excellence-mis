import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMyFeesPageData } from '@/app/actions/student-fees';
import { StudentFeesClient } from '@/components/students/student-fees-client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

export default async function StudentFeesPage() {
  let data;
  try {
    data = await getMyFeesPageData();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load fees.';
    return (
      <div>
        <PageHeader title="Fees & Payments" description="View and pay your unit fees" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-medium">Unable to load fees</p>
          <p className="mt-2">{message}</p>
          <p className="mt-2 text-red-700">
            If you recently updated the system, ask admin to run migrations 008 and 009 in Supabase.
          </p>
          <Link href="/student" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              Back to portal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    redirect('/student/register');
  }

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
