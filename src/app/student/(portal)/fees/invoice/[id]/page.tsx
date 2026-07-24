import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getMyFeePayment } from '@/app/actions/student-fees';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getPaymentSettings } from '@/app/actions/system-settings';
import { FeeInvoiceDocument } from '@/components/fees/fee-invoice-document';
import { PrintInvoiceButton } from '@/components/fees/print-invoice-button';
import { Button } from '@/components/ui/button';
import { getAdmissionNumber } from '@/lib/utils';
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

  const student = data.student as Student;
  const fee = data.fee as FeePayment;
  const admissionNumber = getAdmissionNumber(student);
  const invoiceNumber = `INV-${fee.id.slice(0, 8).toUpperCase()}`;
  
  // Sanitize admission number for filename (replace / with -)
  const sanitizedAdmissionNumber = admissionNumber.replace(/\//g, '-');
  const documentTitle = `${sanitizedAdmissionNumber}_${invoiceNumber}.pdf`;

  const paymentSettings = await getPaymentSettings();

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
      <FeeInvoiceDocument
        fee={data.fee as FeePayment}
        student={data.student as Student}
        paymentSettings={paymentSettings}
      />
    </div>
  );
}
