import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFeePaymentsForStudent } from '@/app/actions/fees';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, getFeeBalance } from '@/lib/utils';
import type { FeePayment } from '@/lib/types';

export default async function StudentFeeStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let fees: FeePayment[];
  try {
    fees = (await getFeePaymentsForStudent(id)) as FeePayment[];
  } catch {
    notFound();
  }

  const totalBilled = fees.reduce((sum, f) => sum + Number(f.amount ?? 0), 0);
  const totalPaid = fees.reduce((sum, f) => sum + Number(f.amount_paid ?? 0), 0);
  const totalDue = fees.reduce((sum, f) => sum + getFeeBalance(f), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Total billed</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Total paid</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="py-5">
            <p className="text-sm text-blue-800">Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(totalDue)}</p>
          </CardContent>
        </Card>
      </div>

      {fees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
          No fee invoices yet. Invoices are generated when units are registered.
        </div>
      ) : (
        <div className="space-y-4">
          {fees.map((fee) => {
            const balance = getFeeBalance(fee);
            const items = fee.items ?? [];
            return (
              <Card key={fee.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {fee.description ?? 'Fee invoice'}
                      </CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        {fee.term && typeof fee.term === 'object' && 'name' in fee.term ? (fee.term as { name: string }).name : 'No term'} ·{' '}
                        {formatDate(fee.created_at)}
                      </p>
                    </div>
                    <Badge status={fee.status}>{fee.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length > 0 && (
                    <div className="mb-4 space-y-1 text-sm">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between gap-4 text-slate-600">
                          <span>
                            {(item.course as { code: string; name: string } | undefined)?.code} —{' '}
                            {(item.course as { code: string; name: string } | undefined)?.name}
                          </span>
                          <span>{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      {Number(fee.discount_amount ?? 0) > 0 && (
                        <div className="flex justify-between gap-4 font-medium text-emerald-700">
                          <span>Discount</span>
                          <span>−{formatCurrency(Number(fee.discount_amount))}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-slate-500">Amount</p>
                      <p className="font-semibold">{formatCurrency(fee.amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Paid</p>
                      <p className="font-semibold text-emerald-700">
                        {formatCurrency(fee.amount_paid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Balance</p>
                      <p className="font-semibold text-blue-700">{formatCurrency(balance)}</p>
                    </div>
                    <div className="flex items-end justify-start sm:justify-end">
                      <Link href={`/dashboard/fees/invoice/${fee.id}`} target="_blank">
                        <Button size="sm" variant="secondary">
                          Download
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
