import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/app/actions/audit-logs';

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

    // Get client IP address from headers if available
    // Note: This won't work in server components, only in server actions with request context
    const ipAddress = undefined; // Would need to be passed from request headers
    const userAgent = undefined; // Would need to be passed from request headers

    await logAuditAction({
      userId: user.id,
      userRole,
      ipAddress,
      userAgent,
      ...params,
    });
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
    }),

  studentDeleted: (studentId: string, studentName: string, details?: string) =>
    logAudit({
      action: 'delete',
      module: 'students',
      entityType: 'student',
      entityId: studentId,
      entityName: studentName,
      details,
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
    }),

  enrollmentDeregistered: (enrollmentId: string, studentName: string, courseName: string, details?: string) =>
    logAudit({
      action: 'deregister',
      module: 'enrollments',
      entityType: 'enrollment',
      entityId: enrollmentId,
      entityName: `${studentName} - ${courseName}`,
      details,
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
    }),

  discountApplied: (feeId: string, studentName: string, discountAmount: number, reason: string) =>
    logAudit({
      action: 'apply_discount',
      module: 'fees',
      entityType: 'fee_payment',
      entityId: feeId,
      entityName: studentName,
      details: `Discount of ${discountAmount} applied: ${reason}`,
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
    }),

  courseDeleted: (courseId: string, courseName: string, details?: string) =>
    logAudit({
      action: 'delete',
      module: 'courses',
      entityType: 'course',
      entityId: courseId,
      entityName: courseName,
      details,
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
    }),

  roleChanged: (userId: string, userName: string, previousRole: string, newRole: string) =>
    logAudit({
      action: 'change_role',
      module: 'users',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: `Role changed from ${previousRole} to ${newRole}`,
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
    }),

  userLoggedOut: (userId: string, userName: string) =>
    logAudit({
      action: 'logout',
      module: 'authentication',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: 'User logged out',
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
    }),
};
