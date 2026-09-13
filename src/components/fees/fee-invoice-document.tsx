import { DocumentLetterhead } from '@/components/documents/document-letterhead';
import { formatCurrency, formatDate, getAdmissionNumber, getFeeBalance, getOriginalFeeAmount, getDiscountAmount } from '@/lib/utils';
import type { FeePayment, Student } from '@/lib/types';
import type { PaymentSettings } from '@/lib/system-settings';
import { FinanceStamp } from '@/components/fees/finance-stamp';

export function FeeInvoiceDocument({
  fee,
  student,
  paymentSettings,
}: {
  fee: FeePayment;
  student: Student;
  paymentSettings?: PaymentSettings;
}) {
  const admissionNumber = getAdmissionNumber(student);
  const programName = (student.program as { name: string } | null)?.name ?? '—';
  const termName = (fee.term as { name: string } | null)?.name ?? '—';
  const items = fee.items ?? [];
  const balance = getFeeBalance(fee);
  const originalAmount = getOriginalFeeAmount(fee);
  const discountAmount = getDiscountAmount(fee);
  const hasDiscount = discountAmount > 0;
  
  // Use invoice_date from database, or current date if viewing
  const invoiceDate = fee.invoice_date || new Date().toISOString().split('T')[0];

  return (
    <div
      id="fee-invoice"
      className="print-document mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <DocumentLetterhead
        documentTitle="OFFICIAL FEE INVOICE"
        documentSubtitle={`Invoice #${fee.id.slice(0, 8).toUpperCase()}`}
        rightMeta={
          <>
            <p>
              <span className="text-slate-500">Invoice Date:</span>{' '}
              <span className="font-medium text-slate-900">{formatDate(invoiceDate)}</span>
            </p>
            {fee.due_date && (
              <p>
                <span className="text-slate-500">Due Date:</span>{' '}
                <span className="font-medium text-slate-900">{formatDate(fee.due_date)}</span>
              </p>
            )}
          </>
        }
      />

      <div className="grid gap-6 py-2 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
          <p className="mt-2 font-semibold text-slate-900">
            {student.first_name} {student.last_name}
          </p>
          <p className="text-slate-600">{student.email}</p>
          <p className="mt-1 font-mono text-slate-700">{admissionNumber}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Details</p>
          <p className="mt-2 text-slate-600">
            <span className="text-slate-500">Programme:</span> {programName}
          </p>
          <p className="text-slate-600">
            <span className="text-slate-500">Semester:</span> {termName}
          </p>
          <p className="text-slate-600">
            <span className="text-slate-500">Status:</span>{' '}
            <span className="font-medium capitalize">{fee.status}</span>
          </p>
        </div>
      </div>

      {fee.description && <p className="mb-4 text-sm text-slate-600">{fee.description}</p>}

      <table className="w-full text-sm">
        <thead className="border-y border-slate-200 bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="py-2.5 pr-4 font-medium">Description</th>
            <th className="py-2.5 text-right font-medium">Amount (KES)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.length > 0 ? (
            items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-4 text-slate-800">
                  {(item.course as { code: string; name: string } | undefined)?.code} —{' '}
                  {(item.course as { code: string; name: string } | undefined)?.name ?? 'Unit fee'}
                </td>
                <td className="py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="py-3 pr-4 text-slate-800">{fee.description ?? 'Fees'}</td>
              <td className="py-3 text-right font-medium">{formatCurrency(originalAmount)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          {hasDiscount && (
            <>
              <tr className="border-t border-slate-200">
                <td className="pt-4 font-semibold text-slate-900">Original Amount</td>
                <td className="pt-4 text-right text-lg font-bold text-slate-900">
                  {formatCurrency(originalAmount)}
                </td>
              </tr>
              <tr>
                <td className="pt-2 text-slate-600">
                  Discount
                  {fee.discount_percentage && ` (${fee.discount_percentage}%)`}
                </td>
                <td className="pt-2 text-right font-medium text-emerald-600">
                  -{formatCurrency(discountAmount)}
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="pt-4 font-semibold text-slate-900">Amount Payable</td>
                <td className="pt-4 text-right text-lg font-bold text-slate-900">
                  {formatCurrency(fee.amount)}
                </td>
              </tr>
            </>
          )}
          {!hasDiscount && (
            <tr className="border-t border-slate-200">
              <td className="pt-4 font-semibold text-slate-900">Total</td>
              <td className="pt-4 text-right text-lg font-bold text-slate-900">
                {formatCurrency(fee.amount)}
              </td>
            </tr>
          )}
          <tr>
            <td className="pt-2 text-slate-600">Amount paid</td>
            <td className="pt-2 text-right font-medium text-emerald-700">
              {formatCurrency(fee.amount_paid)}
            </td>
          </tr>
          <tr>
            <td className="pt-2 font-semibold text-blue-800">Balance due</td>
            <td className="pt-2 text-right text-lg font-bold text-blue-700">
              {formatCurrency(balance)}
            </td>
          </tr>
        </tfoot>
      </table>

      {paymentSettings && balance > 0 && (
        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-900">How to pay</p>
          <p className="mt-2 text-slate-600">
            M-Pesa Paybill: <span className="font-mono font-bold">{paymentSettings.mpesaPaybill}</span>{' '}
            · Account: <span className="font-mono font-bold">{admissionNumber}</span>
          </p>
          <p className="mt-1 text-slate-600">
            Bank payment: {paymentSettings.bankName} · Paybill {paymentSettings.mpesaPaybill} ·
            Account No {paymentSettings.bankAccount} · Name {paymentSettings.bankBranch}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Partial payments are accepted — send what you can and pay the balance later.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 text-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Authorized by</p>
            <p className="mt-2 font-medium text-slate-900">Excellence Online College</p>
            <p className="text-slate-600">Finance Office</p>
          </div>
          <FinanceStamp />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            <p>Official Fee Invoice</p>
            <p>Excellence Online College</p>
          </div>
          <div className="text-right">
            <p>Generated: {formatDate(new Date().toISOString())}</p>
            <p>Invoice #: {fee.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
