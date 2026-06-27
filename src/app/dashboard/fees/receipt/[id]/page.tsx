import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFeePaymentSubmission } from '@/app/actions/fees';
import { FeePaymentReceiptDocument } from '@/components/fees/fee-payment-receipt-document';
import { PrintInvoiceButton } from '@/components/fees/print-invoice-button';
import { Button } from '@/components/ui/button';
import type { FeePayment, FeePaymentSubmission, Student } from '@/lib/types';

export default async function AdminFeeReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let submission;
  try {
    submission = await getFeePaymentSubmission(id);
  } catch {
    notFound();
  }

  const fee = submission.fee_payment as FeePayment;
  const student = fee.student as Student;

  return (
    <div className="bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/fees">
          <Button variant="secondary" size="sm">
            Back to fees
          </Button>
        </Link>
        <PrintInvoiceButton label="Download / Print Receipt" />
      </div>
      <FeePaymentReceiptDocument
        submission={submission as FeePaymentSubmission}
        fee={fee}
        student={student}
      />
    </div>
  );
}
