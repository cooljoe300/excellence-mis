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
  console.log('applyPhotoFromForm - photo:', photo);
  console.log('applyPhotoFromForm - photo type:', photo instanceof File ? 'File' : typeof photo);
  console.log('applyPhotoFromForm - photo size:', photo instanceof File ? photo.size : 'N/A');

  if (!(photo instanceof File) || photo.size === 0) return { photoUrl: undefined as string | undefined };

  console.log('applyPhotoFromForm - Uploading photo for student:', studentId);
  const upload = await uploadStudentPassportPhoto(supabase, studentId, photo);
  console.log('applyPhotoFromForm - Upload result:', upload);

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

  const [profileRes, programsRes, studentByProfileRes, academicTermsRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('programs').select('id, code, name, duration_months, tuition_fee, is_active, description, created_at, updated_at').eq('is_active', true).order('name'),
    supabase
      .from('students')
      .select('*, program:programs(id, code, name)')
      .eq('profile_id', user.id)
      .maybeSingle(),
    supabase.from('academic_terms').select('*').order('start_date', { ascending: false }),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (programsRes.error) throw new Error(programsRes.error.message);
  if (studentByProfileRes.error) throw new Error(studentByProfileRes.error.message);
  if (academicTermsRes.error) throw new Error(academicTermsRes.error.message);

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
    academicTerms: academicTermsRes.data ?? [],
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

  const userEmail = user.email ?? (formData.get('email') as string);
  const phone = (formData.get('phone') as string) || null;

  // Check if student already exists with this email (for admin-registered students)
  if (userEmail) {
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, profile_id, admission_number, email, phone, first_name, last_name')
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
          return { error: 'Failed to link your account to existing student record. Please contact administration.' };
        }

        // Successfully linked - return success with existing student info
        revalidatePath('/student');
        revalidatePath('/student/register');
        after(() => {
          revalidatePath('/dashboard/students');
        });

        return {
          success: true,
          id: existingStudent.id,
          admissionNumber: existingStudent.admission_number,
        };
      } else if (existingStudent.profile_id !== user.id) {
        // Student is already linked to a different account
        return { 
          error: `A student with this email already exists and is linked to another account. Your admission number is ${existingStudent.admission_number}. Please contact administration if this is incorrect.` 
        };
      } else {
        // Student is already linked to this user - just update their info
        const updateResult = await updateMyStudentRecord(existingStudent.id, formData);
        if (updateResult.error) return updateResult;
        
        return {
          success: true,
          id: existingStudent.id,
          admissionNumber: existingStudent.admission_number,
        };
      }
    }
  }

  // Check if student already exists with this phone number
  if (phone) {
    const { data: existingStudentByPhone, error: phoneCheckError } = await supabase
      .from('students')
      .select('id, admission_number, email, phone, first_name, last_name, profile_id')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle();

    if (phoneCheckError) {
      return { error: 'Error checking for existing student: ' + phoneCheckError.message };
    }

    if (existingStudentByPhone) {
      // If student exists by phone but isn't linked to this user, link them
      if (!existingStudentByPhone.profile_id) {
        const { error: linkError } = await supabase
          .from('students')
          .update({ profile_id: user.id })
          .eq('id', existingStudentByPhone.id);

        if (linkError) {
          console.error('Failed to link existing student by phone:', linkError);
          return { error: 'Failed to link your account to existing student record. Please contact administration.' };
        }

        revalidatePath('/student');
        revalidatePath('/student/register');
        after(() => {
          revalidatePath('/dashboard/students');
        });

        return {
          success: true,
          id: existingStudentByPhone.id,
          admissionNumber: existingStudentByPhone.admission_number,
        };
      } else if (existingStudentByPhone.profile_id !== user.id) {
        return { 
          error: `A student with this phone number already exists and is linked to another account. Your admission number is ${existingStudentByPhone.admission_number}. Please contact administration if you need to update your information.` 
        };
      }
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
    // Provide user-friendly error for admission number conflicts
    if (error.message.includes('duplicate key') && error.message.includes('admission_number')) {
      return { 
        error: 'Could not generate a unique admission number. Please try again. The system will automatically find the next available number.' 
      };
    }
    if (error.code === '23505') {
      return { error: 'You have already registered.' };
    }
    return { error: error.message };
  }

  const photoResult = await applyPhotoFromForm(supabase, data.id as string, formData);
  if (photoResult.error) {
    console.warn('Photo upload failed during student creation, but continuing:', photoResult.error);
    // Don't fail the entire registration - just log the error
  } else if (photoResult.photoUrl) {
    const { error: photoUpdateError } = await supabase
      .from('students')
      .update({ photo_url: photoResult.photoUrl })
      .eq('id', data.id)
      .eq('profile_id', user.id);
    if (photoUpdateError) {
      console.warn('Failed to update photo_url in database, but continuing:', photoUpdateError.message);
    }
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
  if (photoResult.error) {
    console.warn('Photo upload failed during student update, but continuing:', photoResult.error);
    // Don't fail the entire update - just log the error
  }

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

  // Add photo URL if uploaded successfully
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
