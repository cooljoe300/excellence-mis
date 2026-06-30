import Link from 'next/link';
import { redirect } from 'next/navigation';
import { processPesapalOrder } from '@/app/actions/pesapal';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default async function PesapalPaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    OrderTrackingId?: string;
    OrderMerchantReference?: string;
  }>;
}) {
  const params = await searchParams;
  const orderTrackingId = params.OrderTrackingId;

  if (!orderTrackingId) {
    redirect('/student/fees');
  }

  let result;
  try {
    result = await processPesapalOrder(orderTrackingId);
  } catch (error) {
    result = {
      error: error instanceof Error ? error.message : 'Could not verify payment.',
    };
  }

  const completed = 'success' in result && result.success && result.statusCode === 1;
  const failed =
    ('error' in result && !!result.error) ||
    ('success' in result && result.success && (result.statusCode === 2 || result.statusCode === 0));
  const pending = !completed && !failed;

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
            ? `Your payment of ${formatCurrency(result.amount ?? 0)} has been received and applied to your invoice.`
            : failed
              ? ('error' in result ? result.error : result.status) ||
                'The payment was not completed. You can try again from your fees page.'
              : 'We are confirming your payment with PesaPal. Refresh this page in a moment if it does not update.'}
        </p>

        {('confirmationCode' in result && result.confirmationCode) && (
          <p className="mt-3 font-mono text-sm text-slate-700">
            Reference: {result.confirmationCode}
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
