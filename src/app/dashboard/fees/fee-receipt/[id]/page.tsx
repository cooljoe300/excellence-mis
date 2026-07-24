import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFeePayment } from '@/app/actions/fees';
import { FeeReceiptDocument } from '@/components/fees/fee-receipt-document';
import { DocumentPdfButton } from '@/components/fees/fee-pdf-button';
import { Button } from '@/components/ui/button';
import { getAdmissionNumber } from '@/lib/utils';
import type { FeePayment, Student } from '@/lib/types';

export default async function AdminFeeReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let fee;
  try {
    fee = await getFeePayment(id);
  } catch {
    notFound();
  }

  const student = fee.student as Student;
  const admissionNumber = getAdmissionNumber(student);
  const receiptNumber = fee.receipt_number || `#${fee.id.slice(0, 8).toUpperCase()}`;
  
  // Sanitize admission number for filename (replace / with -)
  const sanitizedAdmissionNumber = admissionNumber.replace(/\//g, '-');
  const documentTitle = `${sanitizedAdmissionNumber}_${receiptNumber}.pdf`;

  return (
    <div className="bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/dashboard/fees">
          <Button variant="secondary" size="sm">
            Back to fees
          </Button>
        </Link>
        <DocumentPdfButton documentTitle={documentTitle} />
      </div>
      <FeeReceiptDocument
        fee={fee as FeePayment}
        student={student}
      />
    </div>
  );
}
