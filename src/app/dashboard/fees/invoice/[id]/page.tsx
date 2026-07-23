import { notFound } from 'next/navigation';
import { getFeePayment } from '@/app/actions/fees';
import { getPaymentSettings } from '@/app/actions/system-settings';
import { FeeInvoiceDocument } from '@/components/fees/fee-invoice-document';
import { DocumentPdfButton } from '@/components/fees/fee-pdf-button';
import type { FeePayment, Student } from '@/lib/types';

export default async function AdminFeeInvoicePage({
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

  const paymentSettings = await getPaymentSettings();
  const student = fee.student as Student;

  return (
    <div className="bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 max-w-2xl no-print">
        <DocumentPdfButton 
          documentId="fee-invoice"
          filename={`Excellence_Online_College_Fee_Invoice_${fee.id.slice(0, 8).toUpperCase()}.pdf`}
        />
      </div>
      <FeeInvoiceDocument
        fee={fee as FeePayment}
        student={student}
        paymentSettings={paymentSettings}
      />
    </div>
  );
}
