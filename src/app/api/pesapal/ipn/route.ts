import { NextResponse } from 'next/server';
import { processPesapalOrder } from '@/app/actions/pesapal';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderTrackingId =
    searchParams.get('OrderTrackingId') || searchParams.get('orderTrackingId');

  if (!orderTrackingId) {
    return NextResponse.json({ status: 500, message: 'Missing OrderTrackingId' }, { status: 400 });
  }

  try {
    await processPesapalOrder(orderTrackingId);
    return NextResponse.json({
      orderNotificationType: searchParams.get('OrderNotificationType') || 'IPNCHANGE',
      orderTrackingId,
      orderMerchantReference: searchParams.get('OrderMerchantReference') || '',
      status: 200,
    });
  } catch (error) {
    console.error('PesaPal IPN error:', error);
    return NextResponse.json({
      orderNotificationType: searchParams.get('OrderNotificationType') || 'IPNCHANGE',
      orderTrackingId,
      orderMerchantReference: searchParams.get('OrderMerchantReference') || '',
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      OrderTrackingId?: string;
      orderTrackingId?: string;
      OrderMerchantReference?: string;
      OrderNotificationType?: string;
    };

    const orderTrackingId = body.OrderTrackingId || body.orderTrackingId;
    if (!orderTrackingId) {
      return NextResponse.json({ status: 500 }, { status: 400 });
    }

    await processPesapalOrder(orderTrackingId);
    return NextResponse.json({
      orderNotificationType: body.OrderNotificationType || 'IPNCHANGE',
      orderTrackingId,
      orderMerchantReference: body.OrderMerchantReference || '',
      status: 200,
    });
  } catch (error) {
    console.error('PesaPal IPN POST error:', error);
    return NextResponse.json({ status: 500 });
  }
}
