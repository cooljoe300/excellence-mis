import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getMyFeePaymentSubmission } from '@/app/actions/student-fees';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { FeePaymentReceiptDocument } from '@/components/fees/fee-payment-receipt-document';
import { PrintInvoiceButton } from '@/components/fees/print-invoice-button';
import { Button } from '@/components/ui/button';
import { getAdmissionNumber } from '@/lib/utils';
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

  const student = data.student as Student;
  const fee = data.fee as FeePayment;
  const admissionNumber = getAdmissionNumber(student);
  const receiptNumber = fee.receipt_number || `#${fee.id.slice(0, 8).toUpperCase()}`;
  
  // Sanitize admission number for filename (replace / with -)
  const sanitizedAdmissionNumber = admissionNumber.replace(/\//g, '-');
  const documentTitle = `${sanitizedAdmissionNumber}_${receiptNumber}.pdf`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/student/fees">
          <Button variant="secondary" size="sm">
            Back to fees
          </Button>
        </Link>
        <PrintInvoiceButton label="Save as PDF" documentTitle={documentTitle} />
      </div>
      <FeePaymentReceiptDocument
        submission={data.submission as FeePaymentSubmission}
        fee={data.fee as FeePayment}
        student={data.student as Student}
      />
    </div>
  );
}
