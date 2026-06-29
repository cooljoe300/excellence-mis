export type MpesaEnvironment = 'sandbox' | 'production';

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  callbackUrl: string;
  baseUrl: string;
  environment: MpesaEnvironment;
}

export type MpesaAccountType = 'paybill' | 'till';

export function getMpesaAccountType(): MpesaAccountType {
  const accountType = process.env.MPESA_ACCOUNT_TYPE?.trim().toLowerCase();
  if (accountType === 'till' || accountType === 'buygoods' || accountType === 'buy_goods') {
    return 'till';
  }
  return 'paybill';
}

export function getMpesaTransactionType(): 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline' {
  return getMpesaAccountType() === 'till' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline';
}

export function getMpesaConfig(): MpesaConfig | null {
  const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim();
  const passkey = process.env.MPESA_PASSKEY?.trim();
  const shortcode = process.env.MPESA_SHORTCODE?.trim();
  const environment = (process.env.MPESA_ENVIRONMENT?.trim() || 'sandbox') as MpesaEnvironment;

  const callbackUrl =
    process.env.MPESA_CALLBACK_URL?.trim() ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/mpesa/callback`
      : '');

  if (!consumerKey || !consumerSecret || !passkey || !shortcode || !callbackUrl) {
    return null;
  }

  const baseUrl =
    environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  return {
    consumerKey,
    consumerSecret,
    passkey,
    shortcode,
    callbackUrl,
    baseUrl,
    environment,
  };
}

export function getMpesaStkMissingConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.MPESA_CONSUMER_KEY?.trim()) missing.push('MPESA_CONSUMER_KEY');
  if (!process.env.MPESA_CONSUMER_SECRET?.trim()) missing.push('MPESA_CONSUMER_SECRET');
  if (!process.env.MPESA_PASSKEY?.trim()) missing.push('MPESA_PASSKEY');
  if (!process.env.MPESA_SHORTCODE?.trim()) missing.push('MPESA_SHORTCODE');

  const callbackUrl =
    process.env.MPESA_CALLBACK_URL?.trim() ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/mpesa/callback`
      : '');

  if (!callbackUrl) missing.push('MPESA_CALLBACK_URL or NEXT_PUBLIC_APP_URL');

  return missing;
}

export function isMpesaStkConfigured() {
  return getMpesaStkMissingConfig().length === 0;
}

export function mpesaTimestamp() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

export function normalizeKenyanPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith('7')) {
    return `254${digits}`;
  }

  return null;
}

function mpesaPassword(shortcode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

async function getAccessToken(config: MpesaConfig) {
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString(
    'base64'
  );

  const response = await fetch(
    `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      cache: 'no-store',
    }
  );

  const data = (await response.json()) as { access_token?: string; errorMessage?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.errorMessage || 'Could not authenticate with M-Pesa.');
  }

  return data.access_token;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseDescription: string;
}

export async function initiateStkPush(params: {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}) {
  const config = getMpesaConfig();
  if (!config) {
    throw new Error('M-Pesa STK push is not configured on the server.');
  }

  const phone = normalizeKenyanPhone(params.phoneNumber);
  if (!phone) {
    throw new Error('Enter a valid Kenyan mobile number (e.g. 0712 345 678).');
  }

  const amount = Math.round(params.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error('Enter a valid payment amount.');
  }

  const timestamp = mpesaTimestamp();
  const password = mpesaPassword(config.shortcode, config.passkey, timestamp);
  const token = await getAccessToken(config);

  const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: getMpesaTransactionType(),
      Amount: amount,
      PartyA: phone,
      PartyB: config.shortcode,
      PhoneNumber: phone,
      CallBackURL: config.callbackUrl,
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: params.transactionDesc.slice(0, 13),
    }),
  });

  const data = (await response.json()) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseDescription?: string;
    errorMessage?: string;
    fault?: { faultstring?: string };
  };

  if (!response.ok || !data.CheckoutRequestID || !data.MerchantRequestID) {
    throw new Error(
      data.errorMessage ||
        data.fault?.faultstring ||
        data.ResponseDescription ||
        'M-Pesa could not send the payment prompt.'
    );
  }

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseDescription: data.ResponseDescription ?? 'STK push sent.',
  } satisfies StkPushResult;
}

export function extractStkCallbackMetadata(
  items: { Name?: string; Value?: string | number }[] | undefined
) {
  const map = new Map<string, string>();

  for (const item of items ?? []) {
    if (item.Name) {
      map.set(item.Name, String(item.Value ?? ''));
    }
  }

  return {
    amount: Number(map.get('Amount') ?? 0),
    mpesaReceiptNumber: map.get('MpesaReceiptNumber') ?? '',
    phoneNumber: map.get('PhoneNumber') ?? '',
    transactionDate: map.get('TransactionDate') ?? '',
  };
}
