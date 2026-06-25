'use server';

import { createClient } from '@/lib/supabase/server';

export async function getAdmissionNumberFormat(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'admission_number_format')
    .maybeSingle();

  if (error) return 'ADM-{YYYY}-{SEQ4}';
  return data?.value ?? 'ADM-{YYYY}-{SEQ4}';
}

export async function setAdmissionNumberFormat(value: string) {
  const supabase = await createClient();
  const trimmed = value.trim();
  if (!trimmed) return { error: 'Format cannot be empty.' };

  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'admission_number_format', value: trimmed }, { onConflict: 'key' });

  if (error) return { error: error.message };
  return { success: true };
}

