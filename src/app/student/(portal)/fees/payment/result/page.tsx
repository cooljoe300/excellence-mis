import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default async function PesapalPaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    amount?: string;
    confirmationCode?: string;
    error?: string;
    orderTrackingId?: string;
  }>;
}) {
  const params = await searchParams;
  const status = params.status;
  const orderTrackingId = params.orderTrackingId;

  if (!status || !orderTrackingId) {
    redirect('/student/fees');
  }

  const completed = status === 'success';
  const failed = status === 'failed';
  const pending = status === 'pending';
  const amount = params.amount ? Number(params.amount) : 0;
  const errorMessage = params.error;

  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {completed ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        ) : failed ? (
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
        ) : (
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        )}

        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {completed ? 'Payment successful' : failed ? 'Payment not completed' : 'Processing payment'}
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          {completed
            ? `Your payment of ${formatCurrency(amount)} has been received and applied to your invoice.`
            : failed
              ? errorMessage ||
                'The payment was not completed. You can try again from your fees page.'
              : 'We are confirming your payment with PesaPal. Refresh this page in a moment if it does not update.'}
        </p>

        {params.confirmationCode && (
          <p className="mt-3 font-mono text-sm text-slate-700">
            Reference: {params.confirmationCode}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/student/fees">
            <Button>Back to fees</Button>
          </Link>
          {pending && (
            <Link href={`/student/fees/payment/return?OrderTrackingId=${orderTrackingId}`}>
              <Button variant="secondary">Refresh status</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
