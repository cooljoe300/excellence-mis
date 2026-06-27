import { notFound } from 'next/navigation';
import { getFeePayment } from '@/app/actions/fees';
import { getPaymentSettings } from '@/app/actions/system-settings';
import { FeeInvoiceDocument } from '@/components/fees/fee-invoice-document';
import { PrintInvoiceButton } from '@/components/fees/print-invoice-button';
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
      <div className="mx-auto mb-6 max-w-2xl print:hidden">
        <PrintInvoiceButton />
      </div>
      <FeeInvoiceDocument
        fee={fee as FeePayment}
        student={student}
        paymentSettings={paymentSettings}
      />
    </div>
  );
}
