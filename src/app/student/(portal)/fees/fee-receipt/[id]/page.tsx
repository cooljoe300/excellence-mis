import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getFeePayment } from '@/app/actions/fees';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { FeeReceiptDocument } from '@/components/fees/fee-receipt-document';
import { DocumentPdfButton } from '@/components/fees/fee-pdf-button';
import { Button } from '@/components/ui/button';
import { getAdmissionNumber } from '@/lib/utils';
import type { FeePayment, Student } from '@/lib/types';

export default async function StudentFeeReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

  let fee;
  try {
    fee = await getFeePayment(id);
  } catch {
    notFound();
  }

  // Verify this fee belongs to the current student
  if (fee.student_id !== student.id) {
    notFound();
  }

  const admissionNumber = getAdmissionNumber(student);
  const receiptNumber = fee.receipt_number || `#${fee.id.slice(0, 8).toUpperCase()}`;
  
  // Sanitize admission number for filename (replace / with -)
  const sanitizedAdmissionNumber = admissionNumber.replace(/\//g, '-');
  const documentTitle = `${sanitizedAdmissionNumber}_${receiptNumber}.pdf`;

  return (
    <div className="bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/student/fees">
          <Button variant="secondary" size="sm">
            Back to fees
          </Button>
        </Link>
        <DocumentPdfButton documentTitle={documentTitle} />
      </div>
      <FeeReceiptDocument
        fee={fee as FeePayment}
        student={student as Student}
      />
    </div>
  );
}
