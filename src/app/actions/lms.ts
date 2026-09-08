'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createMoodleUser,
  updateMoodleUser,
  getMoodleUserById,
  generateLmsUsername,
  generateTemporaryPassword,
} from '@/lib/moodle';

// Helper function to log sync operations
async function logSyncOperation(
  entityType: 'student' | 'lecturer' | 'course' | 'enrolment',
  entityId: string,
  action: 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER' | 'ENROL_USER' | 'UNENROL_USER' | 'ASSIGN_ROLE' | 'SYNC_COURSE' | 'SYNC_GRADE' | 'BULK_SYNC',
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RETRY',
  moodleId?: string,
  requestData?: Record<string, unknown>,
  responseData?: Record<string, unknown>,
  errorMessage?: string,
  errorCode?: string
) {
  const supabase = await createClient();
  
  try {
    await supabase.from('moodle_sync_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      status,
      moodle_id: moodleId,
      request_data: requestData || null,
      response_data: responseData || null,
      error_message: errorMessage,
      error_code: errorCode,
    });
  } catch (logError) {
    // Don't fail the sync operation if logging fails
    console.error('[MOODLE SYNC] Failed to log sync operation:', logError);
  }
}

export async function importStudentToLms(studentId: string) {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from('students')
    .select('*, program:programs(name, code)')
    .eq('id', studentId)
    .single();

  if (error || !student) {
    await logSyncOperation('student', studentId, 'CREATE_USER', 'FAILED', undefined, undefined, undefined, 'Student not found', 'STUDENT_NOT_FOUND');
    return { error: 'Student not found' };
  }

  // Validation: Check if student has required fields
  if (!student.first_name || !student.last_name) {
    await logSyncOperation('student', studentId, 'CREATE_USER', 'FAILED', undefined, undefined, undefined, 'Student missing name fields', 'MISSING_REQUIRED_FIELDS');
    return { error: 'Student name is required for Moodle account creation' };
  }

  if (!student.email) {
    await logSyncOperation('student', studentId, 'CREATE_USER', 'FAILED', undefined, undefined, undefined, 'Student missing email', 'MISSING_EMAIL');
    return { error: 'Student email is required for Moodle account creation' };
  }

  const admissionNumber = student.admission_number ?? student.student_number;
  if (!admissionNumber) {
    await logSyncOperation('student', studentId, 'CREATE_USER', 'FAILED', undefined, undefined, undefined, 'Student missing admission/student number', 'MISSING_ID_NUMBER');
    return { error: 'Student admission number is required for Moodle account creation' };
  }

  if (student.lms_sync_status === 'synced' && student.lms_user_id) {
    await logSyncOperation('student', studentId, 'CREATE_USER', 'FAILED', student.lms_user_id, undefined, undefined, 'Student is already imported to LMS', 'ALREADY_SYNCED');
    return {
      error: 'Student is already imported to LMS',
      username: student.lms_username,
    };
  }

  const username = generateLmsUsername(admissionNumber);
  const password = generateTemporaryPassword();

  const requestData = {
    username,
    firstname: student.first_name,
    lastname: student.last_name,
    email: student.email,
    idnumber: admissionNumber,
    programme: student.program?.code,
  };

  try {
    const result = await createMoodleUser({
      username,
      password,
      firstname: student.first_name,
      lastname: student.last_name,
      email: student.email,
      idnumber: admissionNumber,
    });

    const { error: updateError } = await supabase
      .from('students')
      .update({
        lms_username: result.username,
        lms_user_id: String(result.id),
        lms_sync_status: 'synced',
        lms_synced_at: new Date().toISOString(),
        lms_sync_error: null,
      })
      .eq('id', studentId);

    if (updateError) {
      await logSyncOperation('student', studentId, 'CREATE_USER', 'FAILED', String(result.id), requestData, { id: result.id, username: result.username }, 'Failed to update student record after Moodle sync', 'DB_UPDATE_FAILED');
      return { error: updateError.message };
    }

    await logSyncOperation('student', studentId, 'CREATE_USER', 'SUCCESS', String(result.id), requestData, { id: result.id, username: result.username });

    revalidatePath(`/dashboard/students/${studentId}`);
    revalidatePath('/dashboard/students');

    return {
      success: true,
      username: result.username,
      temporaryPassword: password,
      lmsUrl: process.env.MOODLE_URL ?? 'https://lms.excellenceonlinecollege.com',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LMS import failed';
    const errorCode = err instanceof Error && 'code' in err ? String((err as { code: unknown }).code) : 'UNKNOWN_ERROR';

    await logSyncOperation('student', studentId, 'CREATE_USER', 'FAILED', undefined, requestData, undefined, message, errorCode);

    await supabase
      .from('students')
      .update({
        lms_sync_status: 'failed',
        lms_sync_error: message,
      })
      .eq('id', studentId);

    revalidatePath(`/dashboard/students/${studentId}`);
    return { error: message };
  }
}

export async function updateStudentInLms(studentId: string) {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from('students')
    .select('*, program:programs(name, code)')
    .eq('id', studentId)
    .single();

  if (error || !student) {
    await logSyncOperation('student', studentId, 'UPDATE_USER', 'FAILED', undefined, undefined, undefined, 'Student not found', 'STUDENT_NOT_FOUND');
    return { error: 'Student not found' };
  }

  if (!student.lms_user_id) {
    await logSyncOperation('student', studentId, 'UPDATE_USER', 'FAILED', undefined, undefined, undefined, 'Student not synced to LMS yet', 'NOT_SYNCED');
    return { error: 'Student is not synced to LMS yet. Use import instead.' };
  }

  const admissionNumber = student.admission_number ?? student.student_number;
  const username = generateLmsUsername(admissionNumber);

  const requestData = {
    id: parseInt(student.lms_user_id, 10),
    username,
    firstname: student.first_name,
    lastname: student.last_name,
    email: student.email,
    idnumber: admissionNumber,
    programme: student.program?.code,
  };

  try {
    const result = await updateMoodleUser({
      id: parseInt(student.lms_user_id, 10),
      username,
      firstname: student.first_name,
      lastname: student.last_name,
      email: student.email,
      idnumber: admissionNumber,
    });

    await logSyncOperation('student', studentId, 'UPDATE_USER', 'SUCCESS', student.lms_user_id, requestData, { id: result.id, username: result.username });

    // Clear any previous error
    await supabase
      .from('students')
      .update({
        lms_sync_error: null,
      })
      .eq('id', studentId);

    revalidatePath(`/dashboard/students/${studentId}`);

    return {
      success: true,
      username: result.username,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LMS update failed';
    const errorCode = err instanceof Error && 'code' in err ? String((err as { code: unknown }).code) : 'UNKNOWN_ERROR';

    await logSyncOperation('student', studentId, 'UPDATE_USER', 'FAILED', student.lms_user_id, requestData, undefined, message, errorCode);

    await supabase
      .from('students')
      .update({
        lms_sync_status: 'failed',
        lms_sync_error: message,
      })
      .eq('id', studentId);

    revalidatePath(`/dashboard/students/${studentId}`);
    return { error: message };
  }
}

export async function retryStudentLmsSync(studentId: string) {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (error || !student) {
    return { error: 'Student not found' };
  }

  // Check if we can retry (not already synced and has a previous error)
  if (student.lms_sync_status === 'synced' && student.lms_user_id) {
    return { error: 'Student is already synced to LMS' };
  }

  // Get the last failed log entry
  const { data: lastLog } = await supabase
    .from('moodle_sync_logs')
    .select('*')
    .eq('entity_id', studentId)
    .eq('entity_type', 'student')
    .eq('action', 'CREATE_USER')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!lastLog) {
    return { error: 'No previous sync attempt found' };
  }

  // Check retry count
  if (lastLog.retry_count >= (lastLog.max_retries || 3)) {
    await supabase
      .from('moodle_sync_logs')
      .update({ status: 'FAILED' })
      .eq('id', lastLog.id);

    return { error: 'Maximum retry attempts exceeded' };
  }

  // Increment retry count and update status to RETRY
  await supabase
    .from('moodle_sync_logs')
    .update({
      status: 'RETRY',
      retry_count: (lastLog.retry_count || 0) + 1,
    })
    .eq('id', lastLog.id);

  // Re-attempt the import
  return await importStudentToLms(studentId);
}

export async function bulkSyncStudentsToLms(options?: {
  programmeId?: string;
  intakeId?: string;
  status?: 'active' | 'inactive' | 'all';
  skipSynced?: boolean;
}) {
  const supabase = await createClient();

  // Build query for students to sync
  let query = supabase
    .from('students')
    .select('id, admission_number, student_number, first_name, last_name, email, lms_sync_status, lms_user_id, program:programs(name, code), intake:intakes(name)');

  // Filter by programme if specified
  if (options?.programmeId) {
    query = query.eq('program_id', options.programmeId);
  }

  // Filter by intake if specified
  if (options?.intakeId) {
    query = query.eq('intake_id', options.intakeId);
  }

  // Filter by status if specified
  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  // Skip already synced students if requested
  if (options?.skipSynced) {
    query = query.or('lms_sync_status.is.null,lms_sync_status.neq.synced');
  }

  const { data: students, error } = await query;

  if (error) {
    return { error: error.message, results: [] };
  }

  if (!students || students.length === 0) {
    return { results: [], message: 'No students found matching criteria' };
  }

  // Generate a temporary ID for the bulk sync log
  const bulkSyncId = `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  // Log the bulk sync operation
  await logSyncOperation('student', bulkSyncId, 'BULK_SYNC', 'PENDING', undefined, { options, studentCount: students.length }, undefined);

  const results = [];
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  for (const student of students) {
    const admissionNumber = student.admission_number ?? student.student_number;

    // Skip if already synced
    if (student.lms_sync_status === 'synced' && student.lms_user_id) {
      skippedCount++;
      results.push({
        studentId: student.id,
        admissionNumber,
        name: `${student.first_name} ${student.last_name}`,
        status: 'skipped',
        message: 'Already synced to LMS',
      });
      continue;
    }

    // Skip if missing required fields
    if (!student.first_name || !student.last_name || !student.email || !admissionNumber) {
      failureCount++;
      results.push({
        studentId: student.id,
        admissionNumber,
        name: `${student.first_name} ${student.last_name}`,
        status: 'failed',
        message: 'Missing required fields (name, email, or admission number)',
      });
      continue;
    }

    // Attempt to sync
    const result = await importStudentToLms(student.id);

    if (result.success) {
      successCount++;
      results.push({
        studentId: student.id,
        admissionNumber,
        name: `${student.first_name} ${student.last_name}`,
        status: 'success',
        username: result.username,
      });
    } else {
      failureCount++;
      results.push({
        studentId: student.id,
        admissionNumber,
        name: `${student.first_name} ${student.last_name}`,
        status: 'failed',
        message: result.error,
      });
    }
  }

  // Update bulk sync log with final status
  const finalStatus = failureCount === 0 ? 'SUCCESS' : 'PARTIAL';
  await supabase
    .from('moodle_sync_logs')
    .update({
      status: finalStatus,
      response_data: {
        total: students.length,
        success: successCount,
        failed: failureCount,
        skipped: skippedCount,
      },
      completed_at: new Date().toISOString(),
    })
    .eq('entity_id', bulkSyncId)
    .eq('action', 'BULK_SYNC')
    .order('created_at', { ascending: false })
    .limit(1);

  revalidatePath('/dashboard/lms');
  revalidatePath('/dashboard/students');

  return {
    results,
    summary: {
      total: students.length,
      success: successCount,
      failed: failureCount,
      skipped: skippedCount,
    },
  };
}
