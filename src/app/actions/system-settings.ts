'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const DEFAULT_ADMISSION_NUMBER_FORMAT = 'EOC/{CODE}/{SEQ3}/{YY}';

export async function getAdmissionNumberFormat(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'admission_number_format')
    .maybeSingle();

  if (error) return DEFAULT_ADMISSION_NUMBER_FORMAT;
  return data?.value ?? DEFAULT_ADMISSION_NUMBER_FORMAT;
}

export async function setAdmissionNumberFormat(value: string) {
  const supabase = await createClient();
  const trimmed = value.trim();
  if (!trimmed) return { error: 'Format cannot be empty.' };
  if (!trimmed.includes('{CODE}')) {
    return { error: 'Format must include {CODE} — the program admission prefix (e.g. CIFA, CPAF).' };
  }

  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'admission_number_format', value: trimmed }, { onConflict: 'key' });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export interface PaymentSettings {
  mpesaPaybill: string;
  mpesaAccountLabel: string;
  mpesaStkEnabled: boolean;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
}

const PAYMENT_SETTING_KEYS = {
  mpesaPaybill: 'mpesa_paybill',
  mpesaAccountLabel: 'mpesa_account_label',
  mpesaStkEnabled: 'mpesa_stk_enabled',
  bankName: 'bank_name',
  bankAccount: 'bank_account',
  bankBranch: 'bank_branch',
} as const;

const PAYMENT_DEFAULTS: PaymentSettings = {
  mpesaPaybill: '522522',
  mpesaAccountLabel: 'Use your admission number as account number',
  mpesaStkEnabled: true,
  bankName: 'Equity Bank',
  bankAccount: '1234567890',
  bankBranch: 'Nairobi',
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const supabase = await createClient();
  const keys = Object.values(PAYMENT_SETTING_KEYS);
  const { data } = await supabase.from('system_settings').select('key, value').in('key', keys);

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    mpesaPaybill: map.get(PAYMENT_SETTING_KEYS.mpesaPaybill) ?? PAYMENT_DEFAULTS.mpesaPaybill,
    mpesaAccountLabel:
      map.get(PAYMENT_SETTING_KEYS.mpesaAccountLabel) ?? PAYMENT_DEFAULTS.mpesaAccountLabel,
    mpesaStkEnabled:
      (map.get(PAYMENT_SETTING_KEYS.mpesaStkEnabled) ?? String(PAYMENT_DEFAULTS.mpesaStkEnabled)) ===
      'true',
    bankName: map.get(PAYMENT_SETTING_KEYS.bankName) ?? PAYMENT_DEFAULTS.bankName,
    bankAccount: map.get(PAYMENT_SETTING_KEYS.bankAccount) ?? PAYMENT_DEFAULTS.bankAccount,
    bankBranch: map.get(PAYMENT_SETTING_KEYS.bankBranch) ?? PAYMENT_DEFAULTS.bankBranch,
  };
}

export async function setPaymentSettings(settings: PaymentSettings) {
  const supabase = await createClient();
  const rows = [
    { key: PAYMENT_SETTING_KEYS.mpesaPaybill, value: settings.mpesaPaybill.trim() },
    { key: PAYMENT_SETTING_KEYS.mpesaAccountLabel, value: settings.mpesaAccountLabel.trim() },
    {
      key: PAYMENT_SETTING_KEYS.mpesaStkEnabled,
      value: settings.mpesaStkEnabled ? 'true' : 'false',
    },
    { key: PAYMENT_SETTING_KEYS.bankName, value: settings.bankName.trim() },
    { key: PAYMENT_SETTING_KEYS.bankAccount, value: settings.bankAccount.trim() },
    { key: PAYMENT_SETTING_KEYS.bankBranch, value: settings.bankBranch.trim() },
  ];

  if (!rows[0].value) return { error: 'M-Pesa paybill is required.' };

  const { error } = await supabase.from('system_settings').upsert(rows, { onConflict: 'key' });
  if (error) return { error: error.message };

  revalidatePath('/student/fees');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

