import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getMyFeePaymentSubmission } from '@/app/actions/student-fees';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { FeePaymentReceiptDocument } from '@/components/fees/fee-payment-receipt-document';
import { PrintInvoiceButton } from '@/components/fees/print-invoice-button';
import { Button } from '@/components/ui/button';
import type { FeePayment, FeePaymentSubmission, Student } from '@/lib/types';

export default async function StudentFeeReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getMyFeePaymentSubmission(id);

  if (!data) {
    const student = await getMyStudentRecord();
    if (!student) redirect('/student/register');
    notFound();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/student/fees">
          <Button variant="secondary" size="sm">
            Back to fees
          </Button>
        </Link>
        <PrintInvoiceButton label="Download / Print Receipt" />
      </div>
      <FeePaymentReceiptDocument
        submission={data.submission as FeePaymentSubmission}
        fee={data.fee as FeePayment}
        student={data.student as Student}
      />
    </div>
  );
}
