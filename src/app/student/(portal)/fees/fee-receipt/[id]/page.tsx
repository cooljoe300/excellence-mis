import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getFeePayment } from '@/app/actions/fees';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { FeeReceiptDocument } from '@/components/fees/fee-receipt-document';
import { FeePdfButton } from '@/components/fees/fee-pdf-button';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/student/fees">
          <Button variant="secondary" size="sm">
            Back to fees
          </Button>
        </Link>
        <FeePdfButton 
          documentId="fee-receipt"
          filename={`Excellence_Online_College_Fee_Receipt_${fee.receipt_number || fee.id.slice(0, 8).toUpperCase()}.pdf`}
        />
      </div>
      <FeeReceiptDocument
        fee={fee as FeePayment}
        student={student as Student}
      />
    </div>
  );
}
