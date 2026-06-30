export type PesapalEnvironment = 'sandbox' | 'production';

export interface PesapalConfig {
  consumerKey: string;
  consumerSecret: string;
  baseUrl: string;
  callbackUrl: string;
  ipnUrl: string;
  environment: PesapalEnvironment;
}

export interface PesapalTransactionStatus {
  payment_method: string;
  amount: number;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  status_code: number;
  merchant_reference: string;
  currency: string;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

export function getPesapalMissingConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.PESAPAL_CONSUMER_KEY?.trim()) missing.push('PESAPAL_CONSUMER_KEY');
  if (!process.env.PESAPAL_CONSUMER_SECRET?.trim()) missing.push('PESAPAL_CONSUMER_SECRET');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl && !process.env.PESAPAL_CALLBACK_URL?.trim()) {
    missing.push('NEXT_PUBLIC_APP_URL or PESAPAL_CALLBACK_URL');
  }

  return missing;
}

export function isPesapalConfigured() {
  return getPesapalMissingConfig().length === 0;
}

export function getPesapalConfig(): PesapalConfig | null {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET?.trim();
  const environment = (process.env.PESAPAL_ENVIRONMENT?.trim() || 'production') as PesapalEnvironment;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  const callbackUrl =
    process.env.PESAPAL_CALLBACK_URL?.trim() || (appUrl ? `${appUrl}/student/fees/payment/return` : '');
  const ipnUrl = process.env.PESAPAL_IPN_URL?.trim() || (appUrl ? `${appUrl}/api/pesapal/ipn` : '');

  if (!consumerKey || !consumerSecret || !callbackUrl || !ipnUrl) {
    return null;
  }

  const baseUrl =
    environment === 'sandbox'
      ? 'https://cybqa.pesapal.com/pesapalv3/api'
      : 'https://pay.pesapal.com/v3/api';

  return {
    consumerKey,
    consumerSecret,
    baseUrl,
    callbackUrl,
    ipnUrl,
    environment,
  };
}

async function getAuthToken(config: PesapalConfig) {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token;
  }

  const response = await fetch(`${config.baseUrl}/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: config.consumerKey,
      consumer_secret: config.consumerSecret,
    }),
    cache: 'no-store',
  });

  const data = (await response.json()) as {
    token?: string;
    expiryDate?: string;
    message?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.token) {
    throw new Error(data.error?.message || data.message || 'Could not authenticate with PesaPal.');
  }

  const expiresAt = data.expiryDate ? new Date(data.expiryDate).getTime() : now + 4 * 60_000;
  tokenCache = { token: data.token, expiresAt };
  return data.token;
}

export async function registerPesapalIpn(ipnUrl: string) {
  const config = getPesapalConfig();
  if (!config) throw new Error('PesaPal is not configured on the server.');

  const token = await getAuthToken(config);
  const response = await fetch(`${config.baseUrl}/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'GET',
    }),
    cache: 'no-store',
  });

  const data = (await response.json()) as {
    ipn_id?: string;
    message?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.ipn_id) {
    throw new Error(data.error?.message || data.message || 'Could not register PesaPal IPN URL.');
  }

  return data.ipn_id;
}

export async function submitPesapalOrder(params: {
  merchantReference: string;
  amount: number;
  description: string;
  notificationId: string;
  callbackUrl: string;
  billingAddress: {
    email_address: string;
    phone_number?: string;
    first_name: string;
    last_name: string;
  };
}) {
  const config = getPesapalConfig();
  if (!config) throw new Error('PesaPal is not configured on the server.');

  const token = await getAuthToken(config);
  const amount = Math.round(params.amount);

  const response = await fetch(`${config.baseUrl}/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: params.merchantReference,
      currency: 'KES',
      amount,
      description: params.description.slice(0, 100),
      callback_url: params.callbackUrl,
      notification_id: params.notificationId,
      billing_address: {
        email_address: params.billingAddress.email_address,
        phone_number: params.billingAddress.phone_number || '',
        country_code: 'KE',
        first_name: params.billingAddress.first_name,
        last_name: params.billingAddress.last_name,
      },
    }),
    cache: 'no-store',
  });

  const data = (await response.json()) as {
    order_tracking_id?: string;
    merchant_reference?: string;
    redirect_url?: string;
    message?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.redirect_url || !data.order_tracking_id) {
    throw new Error(
      data.error?.message || data.message || 'PesaPal could not create the payment request.'
    );
  }

  return {
    orderTrackingId: data.order_tracking_id,
    merchantReference: data.merchant_reference ?? params.merchantReference,
    redirectUrl: data.redirect_url,
  };
}

export async function getPesapalTransactionStatus(orderTrackingId: string) {
  const config = getPesapalConfig();
  if (!config) throw new Error('PesaPal is not configured on the server.');

  const token = await getAuthToken(config);
  const response = await fetch(
    `${config.baseUrl}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  const data = (await response.json()) as PesapalTransactionStatus & {
    message?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Could not fetch PesaPal payment status.');
  }

  return data;
}
