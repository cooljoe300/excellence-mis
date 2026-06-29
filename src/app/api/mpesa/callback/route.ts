import { NextResponse } from 'next/server';
import { extractStkCallbackMetadata } from '@/lib/mpesa';
import { createAdminClient } from '@/lib/supabase/admin';

interface StkCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: { Name?: string; Value?: string | number }[];
      };
    };
  };
}

export async function POST(request: Request) {
  let body: StkCallbackBody;

  try {
    body = (await request.json()) as StkCallbackBody;
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback payload' });
  }

  const callback = body.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const metadata = extractStkCallbackMetadata(callback.CallbackMetadata?.Item);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('complete_mpesa_stk_payment', {
      p_checkout_request_id: callback.CheckoutRequestID,
      p_result_code: callback.ResultCode ?? 1,
      p_result_desc: callback.ResultDesc ?? 'Unknown result',
      p_mpesa_receipt: metadata.mpesaReceiptNumber,
      p_raw_callback: body,
    });

    if (error) {
      console.error('M-Pesa callback error:', error.message);
    } else if (data && typeof data === 'object' && 'error' in data) {
      console.error('M-Pesa callback rejected:', data.error);
    }
  } catch (error) {
    console.error('M-Pesa callback handler failed:', error);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
