'use server';

import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { StudentStatus } from '@/lib/types';
import { uploadStudentPassportPhoto } from '@/lib/student-photo';

async function applyPhotoFromForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  formData: FormData
) {
  const photo = formData.get('photo');
  if (!(photo instanceof File) || photo.size === 0) return { photoUrl: undefined as string | undefined };

  const upload = await uploadStudentPassportPhoto(supabase, studentId, photo);
  if (upload.error) return { error: upload.error };
  return { photoUrl: upload.url };
}

export async function getMyStudentRecord() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log('[getMyStudentRecord] No authenticated user found');
    return null;
  }

  console.log('[getMyStudentRecord] User ID:', user.id);
  console.log('[getMyStudentRecord] User email:', user.email);

  // First try to find student by profile_id (for self-registered students)
  const { data: studentByProfile, error: profileError } = await supabase
    .from('students')
    .select('*, program:programs(*)')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[getMyStudentRecord] Profile query error:', profileError);
    throw new Error(profileError.message);
  }
  
  console.log('[getMyStudentRecord] Student by profile_id:', studentByProfile);
  if (studentByProfile) return studentByProfile;

  // Fallback: Try to find student by email (for admin-registered students)
  console.log('[getMyStudentRecord] Trying fallback query by email');
  const { data: studentByEmail, error: emailError } = await supabase
    .from('students')
    .select('*, program:programs(*)')
    .eq('email', user.email)
    .maybeSingle();

  if (emailError) {
    console.error('[getMyStudentRecord] Email query error:', emailError);
    throw new Error(emailError.message);
  }
  
  console.log('[getMyStudentRecord] Student by email:', studentByEmail);
  
  // If found by email, link the profile_id to the user for future queries
  if (studentByEmail && !studentByEmail.profile_id) {
    console.log('[getMyStudentRecord] Linking profile_id to student');
    const { error: updateError } = await supabase
      .from('students')
      .update({ profile_id: user.id })
      .eq('id', studentByEmail.id);
    
    if (updateError) {
      console.error('[getMyStudentRecord] Failed to link student profile:', updateError);
      // Still return the student even if linking fails
    } else {
      console.log('[getMyStudentRecord] Successfully linked profile_id');
    }
  }

  return studentByEmail;
}

export async function getStudentRegisterPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, programsRes, studentByProfileRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('programs').select('id, code, name, duration_months, tuition_fee, is_active, description, created_at, updated_at').eq('is_active', true).order('name'),
    supabase
      .from('students')
      .select('*, program:programs(id, code, name)')
      .eq('profile_id', user.id)
      .maybeSingle(),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (programsRes.error) throw new Error(programsRes.error.message);
  if (studentByProfileRes.error) throw new Error(studentByProfileRes.error.message);

  let existingStudent = studentByProfileRes.data;

  // Fallback: Try to find student by email (for admin-registered students)
  if (!existingStudent && user.email) {
    const { data: studentByEmail, error: emailError } = await supabase
      .from('students')
      .select('*, program:programs(id, code, name)')
      .eq('email', user.email)
      .maybeSingle();

    if (emailError) throw new Error(emailError.message);
    
    if (studentByEmail) {
      existingStudent = studentByEmail;
      
      // Link the profile_id to the user for future queries
      if (!studentByEmail.profile_id) {
        const { error: updateError } = await supabase
          .from('students')
          .update({ profile_id: user.id })
          .eq('id', studentByEmail.id);
        
        if (updateError) {
          console.error('Failed to link student profile:', updateError);
        }
      }
    }
  }

  const nameParts = (profileRes.data?.full_name ?? '').trim().split(/\s+/);

  return {
    programs: programsRes.data ?? [],
    existingStudent,
    defaultFirstName: existingStudent?.first_name ?? nameParts[0] ?? '',
    defaultLastName: existingStudent?.last_name ?? nameParts.slice(1).join(' ') ?? '',
  };
}

export async function createMyStudentRecord(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  // Ensure the user has the student role in their profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  
  if (profile && profile.role !== 'student') {
    // Update profile role to student
    await supabase
      .from('profiles')
      .update({ role: 'student' })
      .eq('id', user.id);
  }

  const programId = (formData.get('program_id') as string)?.trim();
  if (!programId) {
    return { error: 'Please select a program. Your admission number is based on your program.' };
  }

  const firstName = (formData.get('first_name') as string)?.trim();
  const lastName = (formData.get('last_name') as string)?.trim();
  
  if (!firstName || !lastName) {
    return { error: 'First name and last name are required.' };
  }

  // Check if student already exists with this email (prevents duplicates from admin registration)
  const userEmail = user.email ?? (formData.get('email') as string);
  if (userEmail) {
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('email', userEmail)
      .maybeSingle();

    if (existingStudent) {
      // If student exists but isn't linked to this user, link them
      if (!existingStudent.profile_id) {
        const { error: linkError } = await supabase
          .from('students')
          .update({ profile_id: user.id })
          .eq('id', existingStudent.id);

        if (linkError) {
          console.error('Failed to link existing student:', linkError);
        }
      }
      return { error: 'A student record with this email already exists. Please contact administration if this is incorrect.' };
    }
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      profile_id: user.id,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: userEmail,
      phone: (formData.get('phone') as string) || null,
      date_of_birth: (formData.get('date_of_birth') as string) || null,
      gender: (formData.get('gender') as string) || null,
      nationality: (formData.get('nationality') as string) || null,
      address: (formData.get('address') as string) || null,
      city: (formData.get('city') as string) || null,
      country: (formData.get('country') as string) || 'Kenya',
      emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
      emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
      program_id: programId,
      enrollment_date:
        (formData.get('enrollment_date') as string) ||
        new Date().toISOString().split('T')[0],
      status: 'active',
      registration_source: 'self_registered',
      notes: (formData.get('notes') as string) || null,
      student_number: '',
      admission_number: '',
      lms_sync_status: 'not_synced',
    })
    .select('id, admission_number, student_number')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'You have already registered.' };
    }
    return { error: error.message };
  }

  const photoResult = await applyPhotoFromForm(supabase, data.id as string, formData);
  if (photoResult.error) return { error: photoResult.error };

  if (photoResult.photoUrl) {
    const { error: photoUpdateError } = await supabase
      .from('students')
      .update({ photo_url: photoResult.photoUrl })
      .eq('id', data.id)
      .eq('profile_id', user.id);
    if (photoUpdateError) return { error: photoUpdateError.message };
  }

  revalidatePath('/student');
  revalidatePath('/student/id-card');
  revalidatePath('/student/register');

  // Defer admin list refresh so the student doesn't wait for it
  after(() => {
    revalidatePath('/dashboard/students');
  });

  return {
    success: true,
    id: data.id as string,
    admissionNumber: data.admission_number ?? data.student_number,
  };
}

export async function updateMyStudentRecord(studentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const photoResult = await applyPhotoFromForm(supabase, studentId, formData);
  if (photoResult.error) return { error: photoResult.error };

  // Build update object with only fields that are present in FormData
  const updateData: Record<string, any> = {};
  
  // Only include fields that are actually provided in the form
  if (formData.get('first_name') !== null) {
    updateData.first_name = formData.get('first_name') as string;
  }
  if (formData.get('last_name') !== null) {
    updateData.last_name = formData.get('last_name') as string;
  }
  if (formData.get('phone') !== null) {
    updateData.phone = (formData.get('phone') as string) || null;
  }
  if (formData.get('date_of_birth') !== null) {
    updateData.date_of_birth = (formData.get('date_of_birth') as string) || null;
  }
  if (formData.get('gender') !== null) {
    updateData.gender = (formData.get('gender') as string) || null;
  }
  if (formData.get('nationality') !== null) {
    updateData.nationality = (formData.get('nationality') as string) || null;
  }
  if (formData.get('address') !== null) {
    updateData.address = (formData.get('address') as string) || null;
  }
  if (formData.get('city') !== null) {
    updateData.city = (formData.get('city') as string) || null;
  }
  if (formData.get('country') !== null) {
    updateData.country = (formData.get('country') as string) || 'Kenya';
  }
  if (formData.get('emergency_contact_name') !== null) {
    updateData.emergency_contact_name = (formData.get('emergency_contact_name') as string) || null;
  }
  if (formData.get('emergency_contact_phone') !== null) {
    updateData.emergency_contact_phone = (formData.get('emergency_contact_phone') as string) || null;
  }
  
  // Add photo URL if uploaded
  if (photoResult.photoUrl) {
    updateData.photo_url = photoResult.photoUrl;
  }

  // Only perform update if there are fields to update
  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from('students')
    .update(updateData)
    .eq('id', studentId)
    .eq('profile_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/student');
  revalidatePath('/student/id-card');
  revalidatePath('/student/register');
  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath(`/dashboard/students/${studentId}/id-card`);
  return { success: true };
}

export async function updateAcademicInfo(studentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  // Build update object with only academic fields
  const updateData: Record<string, any> = {};
  
  if (formData.get('program_id') !== null) {
    updateData.program_id = (formData.get('program_id') as string) || null;
  }
  if (formData.get('enrollment_date') !== null) {
    updateData.enrollment_date = (formData.get('enrollment_date') as string) || null;
  }
  if (formData.get('notes') !== null) {
    updateData.notes = (formData.get('notes') as string) || null;
  }

  // Only perform update if there are fields to update
  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from('students')
    .update(updateData)
    .eq('id', studentId)
    .eq('profile_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/student');
  revalidatePath('/student/register');
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}
