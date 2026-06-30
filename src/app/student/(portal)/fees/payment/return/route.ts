import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { processPesapalOrder } from '@/app/actions/pesapal';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderTrackingId = searchParams.get('OrderTrackingId');

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

  const params = new URLSearchParams();
  params.set('orderTrackingId', orderTrackingId);

  if ('error' in result && result.error) {
    params.set('status', 'failed');
    params.set('error', result.error);
  } else if ('success' in result && result.success) {
    if (result.statusCode === 1) {
      params.set('status', 'success');
      if (result.amount != null) params.set('amount', String(result.amount));
      if (result.confirmationCode) params.set('confirmationCode', result.confirmationCode);
    } else if (result.statusCode === 2 || result.statusCode === 0) {
      params.set('status', 'failed');
      params.set('error', result.status || 'The payment was not completed.');
    } else {
      params.set('status', 'pending');
    }
  } else {
    params.set('status', 'pending');
  }

  return NextResponse.redirect(
    new URL(`/student/fees/payment/result?${params.toString()}`, request.url)
  );
}
