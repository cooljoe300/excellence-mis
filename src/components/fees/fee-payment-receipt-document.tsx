import { DocumentLetterhead } from '@/components/documents/document-letterhead';
import { formatCurrency, formatDate, getAdmissionNumber } from '@/lib/utils';
import type { FeePayment, FeePaymentSubmission, Student } from '@/lib/types';

function getReceiptStatusLabel(status: FeePaymentSubmission['status']) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending approval';
}

function getReceiptStatusColor(status: FeePaymentSubmission['status']) {
  if (status === 'approved') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (status === 'rejected') return 'text-red-700 bg-red-50 border-red-200';
  return 'text-amber-700 bg-amber-50 border-amber-200';
}

export function FeePaymentReceiptDocument({
  submission,
  fee,
  student,
}: {
  submission: FeePaymentSubmission;
  fee: FeePayment;
  student: Student;
}) {
  const admissionNumber = getAdmissionNumber(student);
  const programName = (student.program as { name: string } | null)?.name ?? '—';
  const termName = (fee.term as { name: string } | null)?.name ?? '—';
  const statusLabel = getReceiptStatusLabel(submission.status);

  return (
    <div
      id="fee-payment-receipt"
      className="print-document mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <DocumentLetterhead
        documentTitle="Payment Receipt"
        documentSubtitle={`Receipt #${submission.id.slice(0, 8).toUpperCase()}`}
        rightMeta={
          <>
            <p>
              <span className="text-slate-500">Submitted:</span>{' '}
              <span className="font-medium text-slate-900">{formatDate(submission.created_at)}</span>
            </p>
            {submission.reviewed_at && (
              <p>
                <span className="text-slate-500">
                  {submission.status === 'approved' ? 'Approved:' : 'Reviewed:'}
                </span>{' '}
                <span className="font-medium text-slate-900">{formatDate(submission.reviewed_at)}</span>
              </p>
            )}
          </>
        }
      />

      <div className="grid gap-6 py-2 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Received from</p>
          <p className="mt-2 font-semibold text-slate-900">
            {student.first_name} {student.last_name}
          </p>
          <p className="text-slate-600">{student.email}</p>
          <p className="mt-1 font-mono text-slate-700">{admissionNumber}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice details</p>
          <p className="mt-2 text-slate-600">
            <span className="text-slate-500">Programme:</span> {programName}
          </p>
          <p className="text-slate-600">
            <span className="text-slate-500">Semester:</span> {termName}
          </p>
          <p className="text-slate-600">
            <span className="text-slate-500">Invoice:</span> #{fee.id.slice(0, 8).toUpperCase()}
          </p>
          {fee.description && <p className="mt-1 text-slate-600">{fee.description}</p>}
        </div>
      </div>

      <div
        className={`mb-6 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getReceiptStatusColor(submission.status)}`}
      >
        {statusLabel}
      </div>

      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-3 pr-4 text-slate-600">Amount paid</td>
            <td className="py-3 text-right text-lg font-bold text-slate-900">
              {formatCurrency(submission.amount)}
            </td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-slate-600">Payment method</td>
            <td className="py-3 text-right font-medium text-slate-900">{submission.payment_method}</td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-slate-600">
              {submission.payment_method === 'M-Pesa' ? 'M-Pesa confirmation code' : 'Bank reference'}
            </td>
            <td className="py-3 text-right font-mono font-medium text-slate-900">
              {submission.reference_number}
            </td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-slate-600">Invoice total</td>
            <td className="py-3 text-right font-medium text-slate-900">{formatCurrency(fee.amount)}</td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-slate-600">Total confirmed on invoice</td>
            <td className="py-3 text-right font-medium text-emerald-700">
              {formatCurrency(fee.amount_paid)}
            </td>
          </tr>
        </tbody>
      </table>

      {submission.status === 'pending' && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This receipt confirms your payment submission. The amount will be applied to your invoice
          once an administrator verifies your {submission.payment_method === 'M-Pesa' ? 'M-Pesa' : 'bank'}{' '}
          transaction.
        </div>
      )}

      {submission.status === 'approved' && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Payment verified and applied to your fee invoice.
        </div>
      )}

      <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        Official payment receipt — Excellence Online College
      </footer>
    </div>
  );
}
