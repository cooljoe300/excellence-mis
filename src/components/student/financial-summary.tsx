import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, FileText, History, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import type { FeePayment } from '@/lib/types';

interface FinancialSummaryProps {
  summary: {
    totalFees: number;
    feesPaid: number;
    feesBalance: number;
  };
  feePayments: FeePayment[];
}

export function FinancialSummary({ summary, feePayments }: FinancialSummaryProps) {
  const { totalFees, feesPaid, feesBalance } = summary;
  const isPaidInFull = feesBalance === 0;
  const hasFeeStructure = totalFees > 0 || feePayments.length > 0;

  return (
    <Card className={isPaidInFull ? 'border-emerald-200 bg-emerald-50/30' : feesBalance > 0 ? 'border-amber-200 bg-amber-50/30' : undefined}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-700" />
          Financial Summary
        </CardTitle>
        <div className="flex gap-2">
          <Link href="/student/fees">
            <Button size="sm" variant="secondary">
              <FileText className="h-4 w-4 mr-2" />
              View Statement
            </Button>
          </Link>
          {feesBalance > 0 && (
            <Link href="/student/fees">
              <Button size="sm">
                Pay Fees
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasFeeStructure ? (
          <div className="text-center py-6">
            <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">
              Fee structure not configured. Contact Finance Office.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-4 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Total Fees</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(totalFees)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Paid</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(feesPaid)}
                </p>
              </div>
              <div className={`rounded-lg p-4 border ${isPaidInFull ? 'bg-emerald-100 border-emerald-200' : 'bg-amber-100 border-amber-200'}`}>
                <p className="text-sm mb-1">Balance</p>
                <p className={`text-2xl font-bold ${isPaidInFull ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {formatCurrency(feesBalance)}
                </p>
              </div>
            </div>
            
            {feePayments.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Recent Payments</span>
                  <Link href="/student/fees" className="text-sm text-blue-700 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="mt-2 space-y-2">
                  {feePayments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-900">
                          {payment.description || 'Fee Payment'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'Pending'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        <span className={`text-xs ${payment.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}