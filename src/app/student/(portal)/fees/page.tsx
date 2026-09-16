import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMyFeesPageData } from '@/app/actions/student-fees';
import { getPesapalAvailability } from '@/app/actions/pesapal';
import { StudentFeesClient } from '@/components/students/student-fees-client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { logAudit } from '@/lib/audit-logger';

export default async function StudentFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const fromEnrollment = from === 'enrollment';
  const fromRegistration = from === 'registration';

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

  const pesapalAvailability = await getPesapalAvailability();

  // Log that student viewed fees
  await logAudit({
    action: 'view',
    module: 'fees',
    entityType: 'fee_payment',
    entityId: data.student.id,
    entityName: `${data.student.first_name} ${data.student.last_name}`,
    details: 'Student viewed fee statement',
    actorType: 'STUDENT',
  });

  return (
    <div className="pb-8">
      <StudentFeesClient
        student={data.student}
        fees={data.fees}
        paymentSettings={data.paymentSettings}
        pesapalConfigured={pesapalAvailability.configured}
        pesapalMaxAmount={pesapalAvailability.maxTransactionAmount}
        totalDue={data.totalDue}
        totalPaid={data.totalPaid}
        totalBilled={data.totalBilled}
        fromEnrollment={fromEnrollment}
        fromRegistration={fromRegistration}
      />
    </div>
  );
}
