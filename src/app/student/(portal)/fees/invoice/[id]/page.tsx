import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getMyFeePayment } from '@/app/actions/student-fees';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getPaymentSettings } from '@/app/actions/system-settings';
import { FeeInvoiceDocument } from '@/components/fees/fee-invoice-document';
import { PrintInvoiceButton } from '@/components/fees/print-invoice-button';
import { Button } from '@/components/ui/button';
import type { FeePayment, Student } from '@/lib/types';

export default async function StudentFeeInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getMyFeePayment(id);

  if (!data) {
    const student = await getMyStudentRecord();
    if (!student) redirect('/student/register');
    notFound();
  }

  const paymentSettings = await getPaymentSettings();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/student/fees">
          <Button variant="secondary" size="sm">
            Back to fees
          </Button>
        </Link>
        <PrintInvoiceButton label="Save as PDF" />
      </div>
      <FeeInvoiceDocument
        fee={data.fee as FeePayment}
        student={data.student as Student}
        paymentSettings={paymentSettings}
      />
    </div>
  );
}
