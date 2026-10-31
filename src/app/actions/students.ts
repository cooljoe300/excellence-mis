'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  deregisterStudentEnrollmentsAndFees,
  isRestrictedStudentStatus,
} from '@/lib/student-deregistration-fees';
import type { StudentStatus } from '@/lib/types';
import { uploadStudentPassportPhoto } from '@/lib/student-photo';
import { logAudit } from '@/lib/audit-logger';
import { getCurrentUserRole } from '@/lib/auth';

function generateTemporaryPassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function applyPhotoFromForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  formData: FormData
) {
  const photo = formData.get('photo');
  console.log('applyPhotoFromForm (admin) - photo:', photo);
  console.log('applyPhotoFromForm (admin) - photo type:', photo instanceof File ? 'File' : typeof photo);
  console.log('applyPhotoFromForm (admin) - photo size:', photo instanceof File ? photo.size : 'N/A');

  if (!(photo instanceof File) || photo.size === 0) return { photoUrl: undefined as string | undefined };

  console.log('applyPhotoFromForm (admin) - Uploading photo for student:', studentId);
  const upload = await uploadStudentPassportPhoto(supabase, studentId, photo);
  console.log('applyPhotoFromForm (admin) - Upload result:', upload);

  if (upload.error) return { error: upload.error };
  return { photoUrl: upload.url };
}

export async function getStudents(search?: string) {
  const supabase = await createClient();
  
  // Get unique students with their programs
  let query = supabase
    .from('students')
    .select('*, program:programs(*)')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%,admission_number.ilike.%${search}%`
    );
  }

  const { data: students, error: studentsError } = await query;
  if (studentsError) throw new Error(studentsError.message);

  // Get all student intakes
  const studentIds = students.map(s => s.id);
  const { data: studentIntakes, error: intakesError } = await supabase
    .from('student_intakes')
    .select('student_id, intake:intakes(*)')
    .in('student_id', studentIds);
  
  if (intakesError) throw new Error(intakesError.message);

  // Group intakes by student_id
  const intakesByStudent = new Map<string, any[]>();
  studentIntakes?.forEach(si => {
    if (!intakesByStudent.has(si.student_id)) {
      intakesByStudent.set(si.student_id, []);
    }
    intakesByStudent.get(si.student_id)?.push(si.intake);
  });

  // Attach intakes to each student
  const studentsWithIntakes = students.map(student => ({
    ...student,
    intakes: intakesByStudent.get(student.id) || []
  }));

  return studentsWithIntakes;
}

export async function getStudent(id: string) {
  const supabase = await createClient();
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*, program:programs(*)')
    .eq('id', id)
    .single();
  
  if (studentError) throw new Error(studentError.message);

  // Get student intakes
  const { data: studentIntakes, error: intakesError } = await supabase
    .from('student_intakes')
    .select('student_id, intake:intakes(*), is_primary, enrollment_date, status')
    .eq('student_id', id);
  
  if (intakesError) throw new Error(intakesError.message);

  return {
    ...student,
    intakes: studentIntakes?.map(si => ({
      ...si.intake,
      is_primary: si.is_primary,
      enrollment_date: si.enrollment_date,
      status: si.status
    })) || []
  };
}

export async function createStudent(formData: FormData) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const programId = (formData.get('program_id') as string)?.trim();
  if (!programId) {
    return { error: 'Please select a program. Admission numbers are based on the student program.' };
  }

  const email = formData.get('email') as string;
  const firstName = formData.get('first_name') as string;
  const lastName = formData.get('last_name') as string;
  const phone = (formData.get('phone') as string) || null;

  // Check if student already exists with this email or phone
  const { data: existingStudent, error: studentCheckError } = await supabase
    .from('students')
    .select('id, admission_number, email, phone, first_name, last_name')
    .or(`email.eq.${email},phone.eq.${phone}`)
    .limit(1)
    .maybeSingle();

  if (studentCheckError) {
    return { error: 'Error checking for existing student: ' + studentCheckError.message };
  }

  if (existingStudent) {
    const matchReason = existingStudent.email === email 
      ? 'email' 
      : existingStudent.phone === phone ? 'phone number' : 'email or phone';
    return { 
      error: `A student with this ${matchReason} already exists. Student: ${existingStudent.first_name} ${existingStudent.last_name} (${existingStudent.admission_number}). Please check the existing student record instead of creating a duplicate.` 
    };
  }

  // Check if auth user already exists with this email
  const { data: existingUser, error: userCheckError } = await ((adminSupabase as any).auth.admin).listUsers();
  let existingAuthUser = null;
  if (!userCheckError && existingUser) {
    existingAuthUser = existingUser.users.find((u: { email?: string }) => u.email === email);
  }

  let authUserId = existingAuthUser?.id;
  let temporaryPassword = null;

  // Create auth account if it doesn't exist
  if (!existingAuthUser) {
    temporaryPassword = generateTemporaryPassword();
    const { data: authData, error: authError } = await ((adminSupabase as any).auth.admin).createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        role: 'student',
      },
    });

    if (authError) {
      return { error: `Failed to create authentication account: ${authError.message}` };
    }
    authUserId = authData.user.id;

    // Create profile with must_change_password = true
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUserId,
        email: email,
        full_name: `${firstName} ${lastName}`,
        role: 'student',
        must_change_password: true,
      });

    if (profileError) {
      // Rollback auth user creation if profile creation fails
      await ((adminSupabase as any).auth.admin).deleteUser(authUserId);
      return { error: `Failed to create profile: ${profileError.message}` };
    }
  } else {
    // If auth user exists, ensure profile has correct role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', existingAuthUser.id)
      .maybeSingle();
    
    if (profile && profile.role !== 'student') {
      // Update profile role to student
      await supabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('id', existingAuthUser.id);
    }
    
    // Also update auth user metadata
    const currentMeta = (existingAuthUser.user_metadata ?? {}) as Record<string, unknown>;
    if (currentMeta.role !== 'student') {
      await ((adminSupabase as any).auth.admin).updateUserById(existingAuthUser.id, {
        user_metadata: {
          ...currentMeta,
          role: 'student',
        },
      });
    }
    
    authUserId = existingAuthUser.id;
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      profile_id: authUserId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      date_of_birth: (formData.get('date_of_birth') as string) || null,
      gender: (formData.get('gender') as string) || null,
      nationality: (formData.get('nationality') as string) || null,
      address: (formData.get('address') as string) || null,
      city: (formData.get('city') as string) || null,
      country: (formData.get('country') as string) || 'Kenya',
      emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
      emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
      program_id: programId,
      intake_id: (formData.get('intake_id') as string) || null,
      study_mode: (formData.get('study_mode') as string)?.trim() || null,
      enrollment_date:
        (formData.get('enrollment_date') as string) ||
        new Date().toISOString().split('T')[0],
      status: (formData.get('status') as StudentStatus) || 'active',
      registration_source: 'staff_registered',
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
    return { error: error.message };
  }

  // Create student_intakes record for the selected intake
  const intakeId = (formData.get('intake_id') as string) || null;
  if (intakeId) {
    const { error: intakeError } = await supabase
      .from('student_intakes')
      .insert({
        student_id: data.id,
        intake_id: intakeId,
        is_primary: true,
        enrollment_date: (formData.get('enrollment_date') as string) || new Date().toISOString().split('T')[0],
        status: (formData.get('status') as StudentStatus) || 'active',
      });
    
    if (intakeError) {
      console.warn('Failed to create student_intakes record:', intakeError.message);
      // Don't fail the entire registration - just log the error
    }
  }

  // Handle passport photo upload if provided
  const photoResult = await applyPhotoFromForm(supabase, data.id as string, formData);
  if (photoResult.error) {
    console.warn('Photo upload failed during student creation (admin), but continuing:', photoResult.error);
    // Don't fail the entire registration - just log the error
  } else if (photoResult.photoUrl) {
    const { error: photoUpdateError } = await supabase
      .from('students')
      .update({ photo_url: photoResult.photoUrl })
      .eq('id', data.id);
    if (photoUpdateError) {
      console.warn('Failed to update photo_url in database (admin), but continuing:', photoUpdateError.message);
    }
  }

  revalidatePath('/dashboard/students');
  revalidatePath(`/dashboard/students/${data.id}`);
  revalidatePath(`/dashboard/students/${data.id}/id-card`);

  // Log audit action
  await logAudit({
    action: 'create',
    module: 'students',
    entityType: 'student',
    entityId: data.id as string,
    entityName: `${firstName} ${lastName} (${data.admission_number ?? data.student_number})`,
    details: `Created student with email: ${email}, program: ${programId}`,
    newValue: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      program_id: programId,
      status: (formData.get('status') as StudentStatus) || 'active',
    },
  });

  return {
    success: true,
    id: data.id,
    admissionNumber: data.admission_number ?? data.student_number,
    temporaryPassword,
    email,
    phone,
    first_name: firstName,
    last_name: lastName,
    authUserId,
  };
}

export async function updateStudent(id: string, formData: FormData) {
  const supabase = await createClient();
  const newStatus = formData.get('status') as StudentStatus;

  const { data: existing, error: existingError } = await supabase
    .from('students')
    .select('status, program_id')
    .eq('id', id)
    .single();

  if (existingError) return { error: existingError.message };

  const requestedProgramId = (formData.get('program_id') as string) || null;
  if (requestedProgramId && requestedProgramId !== existing.program_id) {
    return {
      error:
        'Programme changes must be made through Student → Programme Enrollment so that the admission number and history are updated safely.',
    };
  }

  const newIntakeId = (formData.get('intake_id') as string) || null;

  const becomingRestricted =
    isRestrictedStudentStatus(newStatus) && !isRestrictedStudentStatus(existing.status);

  if (becomingRestricted) {
    const deregistration = await deregisterStudentEnrollmentsAndFees(supabase, id);
    if ('error' in deregistration) return { error: deregistration.error };
  }

  // Handle passport photo upload if provided
  const photoResult = await applyPhotoFromForm(supabase, id, formData);
  if (photoResult.error) {
    console.warn('Photo upload failed during student update (admin), but continuing:', photoResult.error);
    // Don't fail the entire update - just log the error
  }

  // Build update object
  const updateData: Record<string, any> = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string,
    phone: (formData.get('phone') as string) || null,
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    gender: (formData.get('gender') as string) || null,
    nationality: (formData.get('nationality') as string) || null,
    address: (formData.get('address') as string) || null,
    city: (formData.get('city') as string) || null,
    country: (formData.get('country') as string) || 'Kenya',
    emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
    emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
    // programme changes are intentionally excluded here; they go through the
    // Programme Enrollment workflow.
    intake_id: newIntakeId,
    status: newStatus,
    notes: (formData.get('notes') as string) || null,
  };

  // Add photo URL if uploaded successfully
  if (photoResult.photoUrl) {
    updateData.photo_url = photoResult.photoUrl;
  }

  const { error } = await supabase
    .from('students')
    .update(updateData)
    .eq('id', id);
  if (error) return { error: error.message };

  // Update student_intakes if intake_id changed
  if (newIntakeId) {
    // Check if student already has this intake
    const { data: existingIntake } = await supabase
      .from('student_intakes')
      .select('id')
      .eq('student_id', id)
      .eq('intake_id', newIntakeId)
      .maybeSingle();
    
    if (!existingIntake) {
      // Add new intake
      const { error: intakeInsertError } = await supabase
        .from('student_intakes')
        .insert({
          student_id: id,
          intake_id: newIntakeId,
          is_primary: true,
          enrollment_date: (formData.get('enrollment_date') as string) || new Date().toISOString().split('T')[0],
          status: newStatus,
        });
      
      if (intakeInsertError) {
        console.warn('Failed to add student_intakes record:', intakeInsertError.message);
      }
    } else {
      // Update existing intake status
      const { error: intakeUpdateError } = await supabase
        .from('student_intakes')
        .update({ status: newStatus })
        .eq('student_id', id)
        .eq('intake_id', newIntakeId);
      
      if (intakeUpdateError) {
        console.warn('Failed to update student_intakes record:', intakeUpdateError.message);
      }
    }
  }

  revalidatePath('/dashboard/students');
  revalidatePath(`/dashboard/students/${id}`);
  revalidatePath(`/dashboard/students/${id}/fees`);
  revalidatePath(`/dashboard/students/${id}/id-card`);
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/student/id-card');

  // Log audit action
  await logAudit({
    action: 'update',
    module: 'students',
    entityType: 'student',
    entityId: id,
    entityName: `${updateData.first_name} ${updateData.last_name}`,
    previousValue: { status: existing.status },
    newValue: { status: newStatus },
    details: newStatus !== existing.status ? `Status changed from ${existing.status} to ${newStatus}` : 'Student details updated',
  });

  return { success: true };
}

export async function deleteStudent(id: string) {
  const supabase = await createClient();

  // Get student details before deletion for audit log
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, first_name, last_name, student_number, admission_number')
    .eq('id', id)
    .single();

  if (studentError) return { error: studentError.message };

  const { data: paidFees, error: paidFeesError } = await supabase
    .from('fee_payments')
    .select('id')
    .eq('student_id', id)
    .gt('amount_paid', 0)
    .limit(1);

  if (paidFeesError) return { error: paidFeesError.message };
  if (paidFees?.length) {
    return {
      error:
        'Cannot delete a student with payment history. Set their status to Withdrawn instead — fees already paid are kept for records.',
    };
  }

  const { data: pendingSubmissions, error: pendingError } = await supabase
    .from('fee_payment_submissions')
    .select('id')
    .eq('student_id', id)
    .eq('status', 'pending')
    .limit(1);

  if (pendingError) return { error: pendingError.message };
  if (pendingSubmissions?.length) {
    return {
      error:
        'Cannot delete a student with pending fee payments. Reject or approve them first, or set status to Withdrawn.',
    };
  }

  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/students');
  revalidatePath('/dashboard/fees');

  // Log audit action
  await logAudit({
    action: 'delete',
    module: 'students',
    entityType: 'student',
    entityId: id,
    entityName: `${student.first_name} ${student.last_name} (${student.admission_number ?? student.student_number})`,
    details: 'Student deleted',
    previousValue: student,
  });

  return { success: true };
}

/**
 * Permanently removes a student and everything linked to them.
 *
 * Deleting the students row cascades through enrollments, attendance, invoices,
 * payment submissions/items, discounts, intakes, programme history and payment
 * requests (all student-owned tables use ON DELETE CASCADE). The portal auth
 * user is removed separately because students.profile_id is ON DELETE SET NULL.
 */
export async function deleteStudentCompletely(id: string, confirmation: string) {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin' && role !== 'staff') {
    return { error: 'Only staff or administrators can permanently delete a student.' };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { error: 'Permanent deletion is not configured on the server (service role key missing).' };
  }

  const { data: student, error: studentError } = await admin
    .from('students')
    .select('id, first_name, last_name, student_number, admission_number, email, profile_id')
    .eq('id', id)
    .maybeSingle();

  if (studentError) return { error: studentError.message };
  if (!student) return { error: 'Student not found. They may already have been deleted.' };

  const reference = String(student.admission_number || student.student_number || '').trim();
  if (!reference) {
    return { error: 'This student has no admission number, so deletion cannot be confirmed.' };
  }
  if (confirmation.trim().toUpperCase() !== reference.toUpperCase()) {
    return { error: `Type the admission number ${reference} exactly to confirm deletion.` };
  }

  // Capture a summary for the audit trail before the rows disappear.
  const [feesResult, enrollmentsResult, submissionsResult] = await Promise.all([
    admin.from('fee_payments').select('amount, amount_paid').eq('student_id', id),
    admin.from('enrollments').select('id', { count: 'exact', head: true }).eq('student_id', id),
    admin.from('fee_payment_submissions').select('id', { count: 'exact', head: true }).eq('student_id', id),
  ]);

  const fees = (feesResult.data ?? []) as Array<{ amount: number | string | null; amount_paid: number | string | null }>;
  const totalBilled = fees.reduce((sum, fee) => sum + Number(fee.amount ?? 0), 0);
  const totalPaid = fees.reduce((sum, fee) => sum + Number(fee.amount_paid ?? 0), 0);
  const invoiceCount = fees.length;
  const enrollmentCount = enrollmentsResult.count ?? 0;
  const submissionCount = submissionsResult.count ?? 0;

  const { error: deleteError } = await admin.from('students').delete().eq('id', id);
  if (deleteError) {
    return { error: `Failed to delete student: ${deleteError.message}` };
  }

  let portalAccountRemoved = false;
  let warning: string | undefined;

  if (student.profile_id) {
    const { data: linkedProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', student.profile_id)
      .maybeSingle();

    if (linkedProfile && linkedProfile.role !== 'student') {
      warning =
        'The student record was deleted, but the linked portal profile is not a student account, so it was left untouched. Review it in Users & Roles.';
    } else {
      const { error: authError } = await admin.auth.admin.deleteUser(student.profile_id);

      if (!authError) {
        portalAccountRemoved = true;
      } else {
        const authStatus = (authError as { status?: number }).status;
        const authUserMissing = authStatus === 404 || /not found/i.test(authError.message);

        if (authUserMissing) {
          // Auth user is already gone; remove the leftover profile row if one remains.
          const { error: profileError } = await admin
            .from('profiles')
            .delete()
            .eq('id', student.profile_id);
          portalAccountRemoved = !profileError;
          if (profileError) {
            warning = 'The student record was deleted, but their leftover profile could not be removed.';
          }
        } else {
          console.warn('deleteStudentCompletely: failed to delete auth user:', authError.message);
          warning =
            'The student record and all academic/finance data were deleted, but their portal login could not be removed. Remove it from Users & Roles.';
        }
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/students');
  revalidatePath(`/dashboard/students/${id}`);
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/deregistered-units');
  revalidatePath('/dashboard/attendance');
  revalidatePath('/dashboard/fees');
  revalidatePath('/dashboard/reports');
  revalidatePath('/student');

  // Log audit action
  await logAudit({
    action: 'delete',
    module: 'students',
    entityType: 'student',
    entityId: id,
    entityName: `${student.first_name} ${student.last_name} (${reference})`,
    details:
      `Permanently deleted student · ${invoiceCount} invoice(s) (billed KES ${totalBilled.toFixed(2)}, paid KES ${totalPaid.toFixed(2)}) · ` +
      `${enrollmentCount} enrollment(s) · ${submissionCount} payment submission(s) · ` +
      `portal account ${portalAccountRemoved ? 'removed' : 'not removed'}`,
    previousValue: {
      id,
      first_name: student.first_name,
      last_name: student.last_name,
      admission_number: student.admission_number,
      student_number: student.student_number,
      email: student.email,
      profile_id: student.profile_id,
      invoiceCount,
      totalBilled,
      totalPaid,
      enrollmentCount,
      submissionCount,
      portalAccountRemoved,
    },
    actorType: 'ADMIN',
  });

  return {
    success: true,
    name: `${student.first_name} ${student.last_name}`,
    reference,
    warning,
  };
}

export async function generateStudentLoginDetails(studentId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Get student details
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, admission_number, first_name, last_name, email, phone, profile_id')
    .eq('id', studentId)
    .single();

  if (studentError || !student) {
    return { error: 'Student not found.' };
  }

  if (!student.profile_id) {
    return { error: 'Student does not have a portal account.' };
  }

  // Generate new temporary password
  const temporaryPassword = generateTemporaryPassword();

  // Update auth user password
  const { error: authError } = await ((admin as any).auth.admin).updateUserById(student.profile_id, {
    password: temporaryPassword,
  });

  if (authError) {
    return { error: 'Failed to update password: ' + authError.message };
  }

  // Set must_change_password to true
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq('id', student.profile_id);

  if (profileError) {
    console.error('Failed to set must_change_password:', profileError);
  }

  revalidatePath('/dashboard/students');

  return {
    success: true,
    admissionNumber: student.admission_number,
    email: student.email,
    temporaryPassword,
    phone: student.phone,
    firstName: student.first_name,
    lastName: student.last_name,
  };
}
