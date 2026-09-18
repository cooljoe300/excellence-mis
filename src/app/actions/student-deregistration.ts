'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  getCurrentAcademicTermId,
  setStudentEnrollmentsForTerm,
} from '@/app/actions/enrollments';
import { getMyStudentRecord } from '@/app/actions/student-self';
import {
  deregisterStudentEnrollmentsAndFees,
  isRestrictedStudentStatus,
} from '@/lib/student-deregistration-fees';
import type {
  Course,
  DeregistrationRequestType,
  StudentDeregistrationRequest,
} from '@/lib/types';
import { logAudit } from '@/lib/audit-logger';

export interface EnrolledUnitForDeregistration {
  courseId: string;
  code: string;
  name: string;
  unitFee: number;
  credits: number;
  hasGrades: boolean;
}

function isMissingDeregistrationTable(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes('student_deregistration_requests') ||
      error?.message?.includes('deregistration_request')
  );
}

export async function getMyDeregistrationPageData() {
  const student = await getMyStudentRecord();
  if (!student) return null;

  const supabase = await createClient();
  const termId = await getCurrentAcademicTermId();

  let enrolledUnits: EnrolledUnitForDeregistration[] = [];
  if (termId) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, grade, score, course:courses(id, code, name, unit_fee, credits)')
      .eq('student_id', student.id)
      .eq('term_id', termId)
      .in('status', ['active', 'pending']);

    enrolledUnits = (enrollments ?? [])
      .map((row) => {
        const course = row.course as Course | Course[] | null;
        const c = Array.isArray(course) ? course[0] : course;
        if (!c) return null;
        return {
          courseId: c.id,
          code: c.code,
          name: c.name,
          unitFee: Number(c.unit_fee ?? 0),
          credits: Number(c.credits ?? 0),
          hasGrades: row.grade != null || row.score != null,
        };
      })
      .filter(Boolean) as EnrolledUnitForDeregistration[];
  }

  const { data: requests, error } = await supabase
    .from('student_deregistration_requests')
    .select('*, term:academic_terms(name)')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  if (error && !isMissingDeregistrationTable(error)) {
    throw new Error(error.message);
  }

  return {
    student,
    termId,
    enrolledUnits,
    requests: (requests ?? []) as StudentDeregistrationRequest[],
    setupRequired: Boolean(error && isMissingDeregistrationTable(error)),
  };
}

export async function submitMyDeregistrationRequest(input: {
  requestType: DeregistrationRequestType;
  courseIds: string[];
  reason: string;
}) {
  const student = await getMyStudentRecord();
  if (!student) return { error: 'Student record not found.' };
  if (isRestrictedStudentStatus(student.status)) {
    return { error: 'Your account is not active. Contact the college administration.' };
  }

  const reason = input.reason.trim();
  if (reason.length < 10) {
    return { error: 'Please provide a reason of at least 10 characters.' };
  }

  const termId = await getCurrentAcademicTermId();
  if (!termId) return { error: 'No current academic term is set. Contact the college.' };

  const supabase = await createClient();

  const { data: pending } = await supabase
    .from('student_deregistration_requests')
    .select('id')
    .eq('student_id', student.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pending) {
    return {
      error: 'You already have a pending deregistration request. Cancel it first or wait for admin review.',
    };
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('course_id, grade, score')
    .eq('student_id', student.id)
    .eq('term_id', termId)
    .in('status', ['active', 'pending']);

  if (enrollmentsError) return { error: enrollmentsError.message };

  const enrolledCourseIds = new Set((enrollments ?? []).map((e) => e.course_id as string));
  const gradedCourseIds = new Set(
    (enrollments ?? [])
      .filter((e) => e.grade != null || e.score != null)
      .map((e) => e.course_id as string)
  );

  let courseIds: string[] = [];
  let requestType = input.requestType;

  if (requestType === 'full_withdrawal') {
    if (enrolledCourseIds.size === 0) {
      return { error: 'You are not registered for any units this term.' };
    }
    courseIds = Array.from(enrolledCourseIds).filter((id) => !gradedCourseIds.has(id));
    if (courseIds.length === 0) {
      return {
        error: 'All your enrolled units have grades recorded. Contact the college administration.',
      };
    }
  } else {
    courseIds = Array.from(new Set(input.courseIds.filter(Boolean)));
    if (courseIds.length === 0) {
      return { error: 'Select at least one unit to deregister.' };
    }

    const invalid = courseIds.filter((id) => !enrolledCourseIds.has(id));
    if (invalid.length > 0) {
      return { error: 'One or more selected units are not on your registration.' };
    }

    const graded = courseIds.filter((id) => gradedCourseIds.has(id));
    if (graded.length > 0) {
      return { error: 'Units with grades recorded cannot be deregistered through this form.' };
    }

    if (courseIds.length === enrolledCourseIds.size) {
      requestType = 'full_withdrawal';
    }
  }

  // Get current user ID for tracking
  const { data: { user } } = await (supabase.auth as any).getUser();
  const currentUserId = user?.id;

  const { error: insertError } = await supabase.from('student_deregistration_requests').insert({
    student_id: student.id,
    term_id: termId,
    request_type: requestType,
    course_ids: courseIds,
    reason,
    status: 'pending',
  });

  if (insertError) {
    if (isMissingDeregistrationTable(insertError)) {
      return {
        error:
          'Deregistration requests are not set up yet. Ask admin to run migration 017 in Supabase.',
      };
    }
    if (insertError.message.includes('student_deregistration_one_pending')) {
      return { error: 'You already have a pending deregistration request.' };
    }
    return { error: insertError.message };
  }

  revalidatePath('/student/deregister');
  revalidatePath('/student/enroll');
  revalidatePath('/dashboard/enrollments');

  // Log student deregistration request
  await logAudit({
    action: 'create',
    module: 'enrollments',
    entityType: 'deregistration_request',
    entityId: student.id,
    entityName: `${student.first_name} ${student.last_name}`,
    details: `Student submitted ${requestType === 'full_withdrawal' ? 'full withdrawal' : 'unit deregistration'} request`,
    newValue: { requestType, courseIds, reason },
    actorType: 'STUDENT',
  });

  return { success: true, requestType };
}

export async function cancelMyDeregistrationRequest(requestId: string) {
  const student = await getMyStudentRecord();
  if (!student) return { error: 'Student record not found.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('student_deregistration_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('student_id', student.id)
    .eq('status', 'pending');

  if (error) return { error: error.message };

  revalidatePath('/student/deregister');
  revalidatePath('/dashboard/enrollments');

  // Log deregistration request cancellation
  await logAudit({
    action: 'cancel',
    module: 'enrollments',
    entityType: 'deregistration_request',
    entityId: requestId,
    entityName: `Deregistration request for student ${student.id}`,
    details: 'Student cancelled their deregistration request',
    previousValue: { status: 'pending' },
    newValue: { status: 'cancelled' },
    actorType: 'STUDENT',
  });

  return { success: true };
}

export async function getPendingDeregistrationRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_deregistration_requests')
    .select('*, student:students(*, program:programs(name)), term:academic_terms(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingDeregistrationTable(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []) as StudentDeregistrationRequest[];
}

async function getCourseLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseIds: string[]
) {
  if (courseIds.length === 0) return [];
  const { data } = await supabase
    .from('courses')
    .select('id, code, name')
    .in('id', courseIds);
  return data ?? [];
}

export async function approveDeregistrationRequest(requestId: string, reviewNotes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { data: request, error } = await supabase
    .from('student_deregistration_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single();

  if (error || !request) {
    return { error: error?.message ?? 'Pending deregistration request not found.' };
  }

  const courseIds = (request.course_ids ?? []) as string[];
  const termId = request.term_id as string | null;

  if (request.request_type === 'full_withdrawal') {
    const deregistration = await deregisterStudentEnrollmentsAndFees(
      supabase,
      request.student_id as string,
      user.id,
      reviewNotes
    );
    if ('error' in deregistration) return { error: deregistration.error };

    const { error: statusError } = await supabase
      .from('students')
      .update({ status: 'withdrawn' })
      .eq('id', request.student_id);

    if (statusError) return { error: statusError.message };
  } else {
    if (!termId) return { error: 'Request is missing an academic term.' };

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('course_id, grade, score')
      .eq('student_id', request.student_id as string)
      .eq('term_id', termId)
      .in('status', ['active', 'pending']);

    if (enrollmentsError) return { error: enrollmentsError.message };

    const enrolled = (enrollments ?? []).map((e) => e.course_id as string);
    const gradedCourseIds = new Set(
      (enrollments ?? [])
        .filter((e) => e.grade != null || e.score != null)
        .map((e) => e.course_id as string)
    );

    const gradedRequested = courseIds.filter((id) => gradedCourseIds.has(id));
    if (gradedRequested.length > 0) {
      return {
        error:
          'One or more requested units now have grades recorded. Reject this request or remove grades first.',
      };
    }

    const removeSet = new Set(courseIds);
    const remaining = enrolled.filter((id) => !removeSet.has(id));

    const result = await setStudentEnrollmentsForTerm(
      request.student_id as string,
      termId,
      remaining
    );
    if (result.error) return { error: result.error };

    // Mark the specific enrollments as deregistered with tracking
    const { data: enrollmentsToDeregister } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', request.student_id as string)
      .eq('term_id', termId)
      .in('course_id', courseIds)
      .in('status', ['active', 'pending']);

    if (enrollmentsToDeregister && enrollmentsToDeregister.length > 0) {
      const enrollmentIds = enrollmentsToDeregister.map((e) => e.id as string);
      const { error: deregisterError } = await supabase
        .from('enrollments')
        .update({
          status: 'deregistered',
          deregistered_at: new Date().toISOString(),
          deregistered_by: user.id,
          deregistration_reason: reviewNotes || 'Admin approved deregistration request',
        })
        .in('id', enrollmentIds);
      
      if (deregisterError) return { error: deregisterError.message };
    }

    if ((result.unitsRemoved ?? 0) < courseIds.length) {
      return {
        error:
          'Could not remove all requested units. The student registration may have changed — refresh and try again.',
      };
    }
  }

  const { error: updateError } = await supabase
    .from('student_deregistration_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_notes: reviewNotes?.trim() || null,
    })
    .eq('id', requestId);

  if (updateError) return { error: updateError.message };

  // Log deregistration approval
  await logAudit({
    action: 'approve',
    module: 'enrollments',
    entityType: 'deregistration_request',
    entityId: requestId,
    entityName: `Deregistration request for student ${request.student_id}`,
    details: `Deregistration request approved: ${request.request_type === 'full_withdrawal' ? 'Full withdrawal' : 'Unit deregistration'}`,
    previousValue: { status: 'pending', request_type: request.request_type },
    newValue: { status: 'approved', review_notes: reviewNotes },
    actorType: 'ADMIN',
  });

  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/students');
  revalidatePath('/dashboard/fees');
  revalidatePath(`/dashboard/students/${request.student_id}`);
  revalidatePath('/student/deregister');
  revalidatePath('/student/enroll');
  revalidatePath('/student/fees');

  return { success: true };
}

export async function rejectDeregistrationRequest(requestId: string, reviewNotes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();
  if (!user) return { error: 'You must be signed in.' };

  const notes = reviewNotes?.trim();
  if (!notes || notes.length < 3) {
    return { error: 'Please provide a short reason for rejecting this request.' };
  }

  const { error } = await supabase
    .from('student_deregistration_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_notes: notes,
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) return { error: error.message };

  revalidatePath('/dashboard/enrollments');
  revalidatePath('/student/deregister');

  // Log deregistration request rejection
  await logAudit({
    action: 'reject',
    module: 'enrollments',
    entityType: 'deregistration_request',
    entityId: requestId,
    entityName: `Deregistration request for student`,
    details: `Deregistration request rejected: ${notes}`,
    previousValue: { status: 'pending' },
    newValue: { status: 'rejected', review_notes: notes },
    actorType: 'ADMIN',
  });

  return { success: true };
}

export async function getDeregistrationCourseLabels(courseIds: string[]) {
  const supabase = await createClient();
  return getCourseLabels(supabase, courseIds);
}
