import { formatCurrency, formatDate, getAdmissionNumber, getFeeBalance } from '@/lib/utils';
import type { FeePayment, Student } from '@/lib/types';
import type { PaymentSettings } from '@/app/actions/system-settings';

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

  return (
    <div
      id="fee-invoice"
      className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:shadow-none print:border-slate-300"
    >
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Excellence Online College
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Fee Invoice</h1>
            <p className="mt-1 text-sm text-slate-500">Invoice #{fee.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-500">Date</p>
            <p className="font-medium text-slate-900">{formatDate(fee.created_at)}</p>
            {fee.due_date && (
              <>
                <p className="mt-2 text-slate-500">Due date</p>
                <p className="font-medium text-slate-900">{formatDate(fee.due_date)}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 py-6 sm:grid-cols-2 text-sm">
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

      {fee.description && (
        <p className="mb-4 text-sm text-slate-600">{fee.description}</p>
      )}

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
              <td className="py-3 text-right font-medium">{formatCurrency(fee.amount)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200">
            <td className="pt-4 font-semibold text-slate-900">Total</td>
            <td className="pt-4 text-right text-lg font-bold text-slate-900">
              {formatCurrency(fee.amount)}
            </td>
          </tr>
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
            Bank: {paymentSettings.bankName} · {paymentSettings.bankAccount} ·{' '}
            {paymentSettings.bankBranch}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Partial payments are accepted — send what you can and pay the balance later.
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        This invoice is also available in the student portal under Fees & Payments.
      </p>
    </div>
  );
}
