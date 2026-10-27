'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit-logger';

const ADMISSION_FORMAT_TOKENS = [
  'CODE',
  'YYYY',
  'YY',
  'AY',
  'INTAKE',
  'MODE',
  'CAMPUS',
  'SEQ',
  'SEQ3',
  'SEQ4',
];

/**
 * Validate a programme admission-number format without hard-coding any
 * programme names, codes or prefixes. The format must contain a sequence
 * token so generated numbers stay unique.
 */
function parseAdmissionFormat(raw: FormDataEntryValue | null) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return { value: null as string | null };

  if (!/\{SEQ(?::\d+)?\}|\{SEQ3\}|\{SEQ4\}/.test(value)) {
    return {
      error:
        'The admission number format must include a sequence token such as {SEQ3} or {SEQ:4}.',
    } as const;
  }

  const tokens = Array.from(value.matchAll(/\{([^}]+)\}/g)).map((match) => match[1]);
  const unknown = tokens.filter((token) => {
    if (ADMISSION_FORMAT_TOKENS.includes(token)) return false;
    return !/^SEQ:\d+$/.test(token);
  });

  if (unknown.length > 0) {
    return {
      error: `Unknown admission format token${unknown.length === 1 ? '' : 's'}: ${unknown
        .map((token) => `{${token}}`)
        .join(', ')}.`,
    } as const;
  }

  return { value } as const;
}

function parseSequenceStart(raw: FormDataEntryValue | null) {
  const value = Number.parseInt(String(raw ?? '1'), 10);
  if (!Number.isFinite(value) || value < 1) {
    return { error: 'Admission sequence start must be a whole number of at least 1.' } as const;
  }
  return { value } as const;
}

function parseStudyModes(formData: FormData) {
  const raw = formData.getAll('study_modes');
  const values = raw
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
}

function readProgramConfig(formData: FormData) {
  const format = parseAdmissionFormat(formData.get('admission_number_format'));
  if ('error' in format) return format;

  const sequenceStart = parseSequenceStart(formData.get('admission_sequence_start'));
  if ('error' in sequenceStart) return sequenceStart;

  return {
    admission_number_format: format.value,
    admission_sequence_start: sequenceStart.value,
    program_type: ((formData.get('program_type') as string) || '').trim() || null,
    study_modes: parseStudyModes(formData),
    campus: ((formData.get('campus') as string) || '').trim() || null,
  } as const;
}

export async function getPrograms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function createProgram(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const code = (formData.get('code') as string).trim();
  const admissionPrefix =
    (formData.get('admission_prefix') as string)?.trim().toUpperCase() || code.toUpperCase();

  const config = readProgramConfig(formData);
  if ('error' in config) return { error: config.error };

  const { data, error } = await supabase.from('programs').insert({
    name,
    code,
    admission_prefix: admissionPrefix,
    description: (formData.get('description') as string) || null,
    duration_months: parseInt(formData.get('duration_months') as string) || 12,
    tuition_fee: parseFloat(formData.get('tuition_fee') as string) || 0,
    is_active: formData.get('is_active') === 'true',
    ...config,
  }).select('id').single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/programs');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/curriculum');
  revalidatePath('/dashboard/students/programme-enrollment');

  // Log audit action
  await logAudit({
    action: 'create',
    module: 'programs',
    entityType: 'program',
    entityId: data.id,
    entityName: `${code}: ${name}`,
    details: `Program created: ${code} - ${name}`,
    newValue: { name, code, admission_prefix: admissionPrefix, ...config },
  });

  return { success: true };
}

export async function updateProgram(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const code = (formData.get('code') as string).trim();
  const admissionPrefix =
    (formData.get('admission_prefix') as string)?.trim().toUpperCase() || code.toUpperCase();

  const config = readProgramConfig(formData);
  if ('error' in config) return { error: config.error };

  // Get existing program for audit log
  const { data: existing } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('programs')
    .update({
      name,
      code,
      admission_prefix: admissionPrefix,
      description: (formData.get('description') as string) || null,
      duration_months: parseInt(formData.get('duration_months') as string) || 12,
      tuition_fee: parseFloat(formData.get('tuition_fee') as string) || 0,
      is_active: formData.get('is_active') === 'true',
      ...config,
    })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/programs');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/curriculum');
  revalidatePath('/dashboard/students/programme-enrollment');

  // Log audit action
  await logAudit({
    action: 'update',
    module: 'programs',
    entityType: 'program',
    entityId: id,
    entityName: `${code}: ${name}`,
    details: `Program updated: ${existing?.code}: ${existing?.name} → ${code}: ${name}`,
    previousValue: existing
      ? {
          name: existing.name,
          code: existing.code,
          admission_prefix: existing.admission_prefix,
          admission_number_format: existing.admission_number_format,
          admission_sequence_start: existing.admission_sequence_start,
          program_type: existing.program_type,
          study_modes: existing.study_modes,
          campus: existing.campus,
        }
      : null,
    newValue: {
      name,
      code,
      admission_prefix: admissionPrefix,
      ...config,
    },
  });

  return { success: true };
}

export async function deleteProgram(id: string) {
  const supabase = await createClient();

  // Get existing program for audit log
  const { data: existing } = await supabase
    .from('programs')
    .select('name, code')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/programs');

  // Log audit action
  await logAudit({
    action: 'delete',
    module: 'programs',
    entityType: 'program',
    entityId: id,
    entityName: existing ? `${existing.code}: ${existing.name}` : 'Unknown program',
    details: `Program deleted: ${existing?.code} - ${existing?.name}`,
    previousValue: existing,
  });

  return { success: true };
}
