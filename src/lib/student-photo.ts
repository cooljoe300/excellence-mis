import type { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024;

export async function uploadStudentPassportPhoto(
  supabase: SupabaseClient,
  studentId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: 'Photo must be JPG, PNG, or WebP.' };
  }

  if (file.size > MAX_BYTES) {
    return { error: 'Photo must be 2 MB or smaller.' };
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${studentId}/passport.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from('student-photos').upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes('bucket')) {
      return {
        error:
          'Photo upload is not set up yet. Ask admin to run migration 013_student_photos_storage.sql in Supabase.',
      };
    }
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from('student-photos').getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}` };
}
