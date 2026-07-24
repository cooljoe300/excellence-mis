'use client';

import { DocumentLetterhead } from '@/components/documents/document-letterhead';
import { formatCurrency, formatDate, getAdmissionNumber, numberToWords } from '@/lib/utils';
import type { FeePayment, Student } from '@/lib/types';
import { FinanceStamp } from '@/components/fees/finance-stamp';

export function FeeReceiptDocument({
  fee,
  student,
}: {
  fee: FeePayment;
  student: Student;
}) {
  const admissionNumber = getAdmissionNumber(student);
  const programName = (student.program as { name: string } | null)?.name ?? '—';
  const termName = (fee.term as { name: string } | null)?.name ?? '—';
  const receiptNumber = fee.receipt_number || `#${fee.id.slice(0, 8).toUpperCase()}`;
  const balance = fee.amount - (fee.amount_paid || 0);
  const amountInWords = numberToWords(fee.amount_paid || 0);
  
  // Use receipt_date from database, or current date if viewing
  const receiptDate = fee.receipt_date || new Date().toISOString().split('T')[0];

  return (
    <>
      {/* A5 Print Layout */}
      <style jsx global>{`
        @page {
          size: A5 portrait;
          margin: 0;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .print-document {
            width: 148mm;
            min-height: 210mm;
            margin: 0 auto;
            page-break-after: always;
          }
        }
      `}</style>
      
      <div
        id="fee-receipt"
        className="print-document mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        <DocumentLetterhead
          documentTitle="OFFICIAL FEE RECEIPT"
          documentSubtitle={`Receipt #${receiptNumber}`}
          rightMeta={
            <>
              <p>
                <span className="text-slate-500">Receipt Date:</span>{' '}
                <span className="font-medium text-slate-900">{formatDate(receiptDate)}</span>
              </p>
              {fee.paid_date && (
                <p>
                  <span className="text-slate-500">Payment Date:</span>{' '}
                  <span className="font-medium text-slate-900">{formatDate(fee.paid_date)}</span>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment details</p>
            <p className="mt-2 text-slate-600">
              <span className="text-slate-500">Programme:</span> {programName}
            </p>
            <p className="text-slate-600">
              <span className="text-slate-500">Semester:</span> {termName}
            </p>
            <p className="text-slate-600">
              <span className="text-slate-500">Payment Method:</span> {fee.payment_method || '—'}
            </p>
            {fee.reference_number && (
              <p className="text-slate-600">
                <span className="text-slate-500">Reference:</span> {fee.reference_number}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          PAID
        </div>

        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-3 pr-4 text-slate-600">Total Amount</td>
              <td className="py-3 text-right font-medium text-slate-900">{formatCurrency(fee.amount)}</td>
            </tr>
            <tr>
              <td className="py-3 pr-4 text-slate-600">Amount Paid</td>
              <td className="py-3 text-right text-lg font-bold text-emerald-700">
                {formatCurrency(fee.amount_paid || 0)}
              </td>
            </tr>
            {balance > 0 && (
              <tr>
                <td className="py-3 pr-4 text-slate-600">Balance Due</td>
                <td className="py-3 text-right font-medium text-amber-700">{formatCurrency(balance)}</td>
              </tr>
            )}
            <tr>
              <td className="py-3 pr-4 text-slate-600">Amount in Words</td>
              <td className="py-3 text-right font-medium text-slate-900">{amountInWords}</td>
            </tr>
          </tbody>
        </table>

        {fee.description && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Description</p>
            <p className="mt-1">{fee.description}</p>
          </div>
        )}

        <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 text-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confirmed by</p>
              <p className="mt-2 font-medium text-slate-900">Excellence Online College</p>
              <p className="text-slate-600">Finance Office</p>
            </div>
            <FinanceStamp />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div>
              <p>Official Fee Receipt</p>
              <p>Excellence Online College</p>
            </div>
            <div className="text-right">
              <p>Generated: {formatDate(new Date().toISOString())}</p>
              <p>Receipt #: {receiptNumber}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
