import { createClient } from '@/lib/supabase/server';
import { logAuditAction, revalidateAuditLogs } from '@/app/actions/audit-logs';

/**
 * Helper function to log audit actions from server components and actions
 * This provides a consistent way to track important system events
 */
export async function logAudit(params: {
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  details?: string;
  status?: 'success' | 'failure' | 'pending';
  errorMessage?: string;
  actorType?: 'ADMIN' | 'STAFF' | 'STUDENT' | 'SYSTEM';
}) {
  try {
    const supabase = await createClient();
    // @ts-ignore - Supabase v2 API
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Attempted to log audit action without authenticated user');
      return null;
    }

    // Get user profile to get role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'unknown';

    // Determine actor_type based on role if not provided
    let actorType = params.actorType;
    if (!actorType) {
      if (userRole === 'superadmin' || userRole === 'admin') {
        actorType = 'ADMIN';
      } else if (userRole === 'staff' || userRole === 'teacher') {
        actorType = 'STAFF';
      } else if (userRole === 'student') {
        actorType = 'STUDENT';
      } else {
        actorType = 'SYSTEM';
      }
    }

    // Get client IP address from headers if available
    // Note: This won't work in server components, only in server actions with request context
    const ipAddress = undefined; // Would need to be passed from request headers
    const userAgent = undefined; // Would need to be passed from request headers

    await logAuditAction({
      userId: user.id,
      userRole,
      actorType,
      ipAddress,
      userAgent,
      ...params,
    });

    // Revalidate audit logs page to show new entries
    await revalidateAuditLogs();
  } catch (error) {
    console.error('Failed to log audit action:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Predefined audit log helpers for common actions
 */
export const auditLogHelpers = {
  // Student actions
  studentCreated: (studentId: string, studentName: string, details?: string) =>
    logAudit({
      action: 'create',
      module: 'students',
      entityType: 'student',
      entityId: studentId,
      entityName: studentName,
      details,
      actorType: 'ADMIN',
    }),

  studentUpdated: (studentId: string, studentName: string, previousValue: any, newValue: any, details?: string) =>
    logAudit({
      action: 'update',
      module: 'students',
      entityType: 'student',
      entityId: studentId,
      entityName: studentName,
      previousValue,
      newValue,
      details,
      actorType: 'ADMIN',
    }),

  studentDeleted: (studentId: string, studentName: string, details?: string) =>
    logAudit({
      action: 'delete',
      module: 'students',
      entityType: 'student',
      entityId: studentId,
      entityName: studentName,
      details,
      actorType: 'ADMIN',
    }),

  // Student activity logging
  studentLoggedIn: (studentId: string, studentName: string) =>
    logAudit({
      action: 'login',
      module: 'authentication',
      entityType: 'user',
      entityId: studentId,
      entityName: studentName,
      details: 'Student logged in',
      actorType: 'STUDENT',
    }),

  studentLoggedOut: (studentId: string, studentName: string) =>
    logAudit({
      action: 'logout',
      module: 'authentication',
      entityType: 'user',
      entityId: studentId,
      entityName: studentName,
      details: 'Student logged out',
      actorType: 'STUDENT',
    }),

  studentViewedTimetable: (studentId: string, studentName: string) =>
    logAudit({
      action: 'view',
      module: 'timetable',
      entityType: 'timetable',
      entityId: studentId,
      entityName: studentName,
      details: 'Student viewed timetable',
      actorType: 'STUDENT',
    }),

  studentViewedFees: (studentId: string, studentName: string) =>
    logAudit({
      action: 'view',
      module: 'fees',
      entityType: 'fee_payment',
      entityId: studentId,
      entityName: studentName,
      details: 'Student viewed fee statement',
      actorType: 'STUDENT',
    }),

  studentViewedEnrollments: (studentId: string, studentName: string) =>
    logAudit({
      action: 'view',
      module: 'enrollments',
      entityType: 'enrollment',
      entityId: studentId,
      entityName: studentName,
      details: 'Student viewed enrolled units',
      actorType: 'STUDENT',
    }),

  studentOpenedLMS: (studentId: string, studentName: string) =>
    logAudit({
      action: 'view',
      module: 'lms',
      entityType: 'lms',
      entityId: studentId,
      entityName: studentName,
      details: 'Student opened My Learning',
      actorType: 'STUDENT',
    }),

  studentViewedNotes: (studentId: string, studentName: string, courseName: string, activityName: string) =>
    logAudit({
      action: 'view',
      module: 'lms',
      entityType: 'notes',
      entityId: studentId,
      entityName: studentName,
      details: `Student viewed notes: ${courseName} - ${activityName}`,
      newValue: { course: courseName, activity: activityName },
      actorType: 'STUDENT',
    }),

  studentViewedRecordedClass: (studentId: string, studentName: string, className: string) =>
    logAudit({
      action: 'view',
      module: 'lms',
      entityType: 'recorded_class',
      entityId: studentId,
      entityName: studentName,
      details: `Student viewed recorded class: ${className}`,
      newValue: { class: className },
      actorType: 'STUDENT',
    }),

  studentJoinedOnlineClass: (studentId: string, studentName: string, className: string) =>
    logAudit({
      action: 'join',
      module: 'lms',
      entityType: 'online_class',
      entityId: studentId,
      entityName: studentName,
      details: `Student joined online class: ${className}`,
      newValue: { class: className },
      actorType: 'STUDENT',
    }),

  // Enrollment actions
  enrollmentCreated: (enrollmentId: string, studentName: string, courseName: string, details?: string) =>
    logAudit({
      action: 'create',
      module: 'enrollments',
      entityType: 'enrollment',
      entityId: enrollmentId,
      entityName: `${studentName} - ${courseName}`,
      details,
      actorType: 'ADMIN',
    }),

  enrollmentUpdated: (enrollmentId: string, studentName: string, courseName: string, previousValue: any, newValue: any, details?: string) =>
    logAudit({
      action: 'update',
      module: 'enrollments',
      entityType: 'enrollment',
      entityId: enrollmentId,
      entityName: `${studentName} - ${courseName}`,
      previousValue,
      newValue,
      details,
      actorType: 'ADMIN',
    }),

  enrollmentDeregistered: (enrollmentId: string, studentName: string, courseName: string, details?: string) =>
    logAudit({
      action: 'deregister',
      module: 'enrollments',
      entityType: 'enrollment',
      entityId: enrollmentId,
      entityName: `${studentName} - ${courseName}`,
      details,
      actorType: 'ADMIN',
    }),

  studentRegisteredUnit: (studentId: string, studentName: string, courseName: string) =>
    logAudit({
      action: 'create',
      module: 'enrollments',
      entityType: 'enrollment',
      entityId: studentId,
      entityName: studentName,
      details: `Student registered unit: ${courseName}`,
      newValue: { course: courseName },
      actorType: 'STUDENT',
    }),

  studentDeregisteredUnit: (studentId: string, studentName: string, courseName: string) =>
    logAudit({
      action: 'deregister',
      module: 'enrollments',
      entityType: 'enrollment',
      entityId: studentId,
      entityName: studentName,
      details: `Student deregistered unit: ${courseName}`,
      newValue: { course: courseName },
      actorType: 'STUDENT',
    }),

  // Fee actions
  feeCreated: (feeId: string, studentName: string, amount: number, details?: string) =>
    logAudit({
      action: 'create',
      module: 'fees',
      entityType: 'fee_payment',
      entityId: feeId,
      entityName: `${studentName} - ${amount}`,
      details,
      actorType: 'ADMIN',
    }),

  feeUpdated: (feeId: string, studentName: string, previousValue: any, newValue: any, details?: string) =>
    logAudit({
      action: 'update',
      module: 'fees',
      entityType: 'fee_payment',
      entityId: feeId,
      entityName: studentName,
      previousValue,
      newValue,
      details,
      actorType: 'ADMIN',
    }),

  discountApplied: (feeId: string, studentName: string, discountAmount: number, reason: string) =>
    logAudit({
      action: 'apply_discount',
      module: 'fees',
      entityType: 'fee_payment',
      entityId: feeId,
      entityName: studentName,
      details: `Discount of ${discountAmount} applied: ${reason}`,
      actorType: 'ADMIN',
    }),

  // Course/Program actions
  courseCreated: (courseId: string, courseName: string, details?: string) =>
    logAudit({
      action: 'create',
      module: 'courses',
      entityType: 'course',
      entityId: courseId,
      entityName: courseName,
      details,
      actorType: 'ADMIN',
    }),

  courseUpdated: (courseId: string, courseName: string, previousValue: any, newValue: any, details?: string) =>
    logAudit({
      action: 'update',
      module: 'courses',
      entityType: 'course',
      entityId: courseId,
      entityName: courseName,
      previousValue,
      newValue,
      details,
      actorType: 'ADMIN',
    }),

  courseDeleted: (courseId: string, courseName: string, details?: string) =>
    logAudit({
      action: 'delete',
      module: 'courses',
      entityType: 'course',
      entityId: courseId,
      entityName: courseName,
      details,
      actorType: 'ADMIN',
    }),

  // User/Role actions
  userCreated: (userId: string, userName: string, role: string, details?: string) =>
    logAudit({
      action: 'create',
      module: 'users',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: `Role: ${role}`,
      actorType: 'ADMIN',
    }),

  userUpdated: (userId: string, userName: string, previousValue: any, newValue: any, details?: string) =>
    logAudit({
      action: 'update',
      module: 'users',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      previousValue,
      newValue,
      details,
      actorType: 'ADMIN',
    }),

  roleChanged: (userId: string, userName: string, previousRole: string, newRole: string) =>
    logAudit({
      action: 'change_role',
      module: 'users',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: `Role changed from ${previousRole} to ${newRole}`,
      actorType: 'ADMIN',
    }),

  // Settings actions
  settingsUpdated: (settingName: string, previousValue: any, newValue: any) =>
    logAudit({
      action: 'update',
      module: 'settings',
      entityType: 'setting',
      entityName: settingName,
      previousValue,
      newValue,
      details: `Setting ${settingName} updated`,
      actorType: 'ADMIN',
    }),

  // Authentication actions
  userLoggedIn: (userId: string, userName: string) =>
    logAudit({
      action: 'login',
      module: 'authentication',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: 'User logged in',
      actorType: 'STAFF',
    }),

  userLoggedOut: (userId: string, userName: string) =>
    logAudit({
      action: 'logout',
      module: 'authentication',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: 'User logged out',
      actorType: 'STAFF',
    }),

  // Timetable actions
  timetableCreated: (timetableId: string, courseName: string, details?: string) =>
    logAudit({
      action: 'create',
      module: 'timetable',
      entityType: 'timetable',
      entityId: timetableId,
      entityName: courseName,
      details,
      actorType: 'ADMIN',
    }),

  timetableUpdated: (timetableId: string, courseName: string, previousValue: any, newValue: any, details?: string) =>
    logAudit({
      action: 'update',
      module: 'timetable',
      entityType: 'timetable',
      entityId: timetableId,
      entityName: courseName,
      previousValue,
      newValue,
      details,
      actorType: 'ADMIN',
    }),

  // LMS actions
  lmsProgrammeCreated: (programmeId: string, programmeName: string, details?: string) =>
    logAudit({
      action: 'create',
      module: 'lms',
      entityType: 'lms_programme',
      entityId: programmeId,
      entityName: programmeName,
      details,
      actorType: 'ADMIN',
    }),

  lmsProgrammeUpdated: (programmeId: string, programmeName: string, previousValue: any, newValue: any, details?: string) =>
    logAudit({
      action: 'update',
      module: 'lms',
      entityType: 'lms_programme',
      entityId: programmeId,
      entityName: programmeName,
      previousValue,
      newValue,
      details,
      actorType: 'ADMIN',
    }),
};
