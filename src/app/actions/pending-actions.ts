'use server';

import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export type PendingActionPriority = 'urgent' | 'high' | 'normal' | 'info';

export interface PendingAction {
  id: string;
  title: string;
  description: string;
  count: number;
  priority: PendingActionPriority;
  icon: string;
  route: string;
  category: string;
  metadata?: {
    amount?: number;
    studentName?: string;
    admissionNumber?: string;
  };
}

export async function getAdminPendingActions(): Promise<PendingAction[]> {
  const supabase = await createClient();
  const actions: PendingAction[] = [];

  try {
    // 1. Pending Fee Approvals (HIGH priority)
    const { count: pendingApprovalsCount, data: pendingApprovals } = await supabase
      .from('fee_payment_submissions')
      .select('amount, student:students(first_name, last_name, admission_number)', { count: 'exact', head: false })
      .eq('status', 'pending');

    if (pendingApprovalsCount && pendingApprovalsCount > 0) {
      const totalAmount = pendingApprovals?.reduce((sum, s: any) => sum + Number(s.amount || 0), 0) || 0;
      actions.push({
        id: 'pending-fee-approvals',
        title: 'Pending Fee Approvals',
        description: totalAmount > 0 
          ? `${pendingApprovalsCount} payments awaiting approval — ${formatCurrency(totalAmount)}`
          : `${pendingApprovalsCount} payments awaiting approval`,
        count: pendingApprovalsCount,
        priority: 'high',
        icon: 'CreditCard',
        route: '/dashboard/fees',
        category: 'fees',
        metadata: { amount: totalAmount },
      });
    }

    // 2. Failed WhatsApp Notifications (HIGH priority)
    const { count: failedNotificationsCount } = await supabase
      .from('whatsapp_notifications')
      .select('*', { count: 'exact', head: false })
      .eq('status', 'failed');

    if (failedNotificationsCount && failedNotificationsCount > 0) {
      actions.push({
        id: 'failed-whatsapp-notifications',
        title: 'Failed WhatsApp Notifications',
        description: `${failedNotificationsCount} notifications failed to send`,
        count: failedNotificationsCount,
        priority: 'high',
        icon: 'MessageCircle',
        route: '/dashboard/settings',
        category: 'notifications',
      });
    }

    // 3. Student Deregistration Requests (HIGH priority)
    const { count: deregistrationRequestsCount } = await supabase
      .from('student_deregistration_requests')
      .select('*', { count: 'exact', head: false })
      .eq('status', 'pending');

    if (deregistrationRequestsCount && deregistrationRequestsCount > 0) {
      actions.push({
        id: 'deregistration-requests',
        title: 'Student Deregistration Requests',
        description: `${deregistrationRequestsCount} requests awaiting review`,
        count: deregistrationRequestsCount,
        priority: 'high',
        icon: 'UserMinus',
        route: '/dashboard/students',
        category: 'students',
      });
    }

    // 4. Students with Outstanding Fees (NORMAL priority)
    const { data: outstandingPayments } = await supabase
      .from('fee_payments')
      .select('student_id, amount, amount_paid')
      .gt('amount', 0);

    const studentsWithOutstanding = new Set(
      outstandingPayments?.filter((p: any) => Number(p.amount_paid || 0) < Number(p.amount)).map((p: any) => p.student_id) || []
    );
    
    if (studentsWithOutstanding.size > 0) {
      actions.push({
        id: 'outstanding-fees',
        title: 'Students with Outstanding Fees',
        description: `${studentsWithOutstanding.size} students have unpaid balances`,
        count: studentsWithOutstanding.size,
        priority: 'normal',
        icon: 'AlertCircle',
        route: '/dashboard/fees',
        category: 'fees',
      });
    }

    // 5. Incomplete Student Profiles (NORMAL priority)
    const { data: incompleteProfiles } = await supabase
      .from('students')
      .select('id, first_name, last_name, admission_number, phone, email')
      .or('phone.is.null,phone.eq.,email.is.null,email.eq.');

    if (incompleteProfiles && incompleteProfiles.length > 0) {
      actions.push({
        id: 'incomplete-profiles',
        title: 'Incomplete Student Profiles',
        description: `${incompleteProfiles.length} students missing contact information`,
        count: incompleteProfiles.length,
        priority: 'normal',
        icon: 'User',
        route: '/dashboard/students',
        category: 'students',
      });
    }

    // 6. Pending Enrollments (NORMAL priority)
    const { count: pendingEnrollmentsCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: false })
      .eq('status', 'pending');

    if (pendingEnrollmentsCount && pendingEnrollmentsCount > 0) {
      actions.push({
        id: 'pending-enrollments',
        title: 'Pending Enrollments',
        description: `${pendingEnrollmentsCount} course enrollments awaiting activation`,
        count: pendingEnrollmentsCount,
        priority: 'normal',
        icon: 'ClipboardList',
        route: '/dashboard/enrollments',
        category: 'academic',
      });
    }

    // 7. Overdue Payments (HIGH priority)
    const { count: overduePaymentsCount } = await supabase
      .from('fee_payments')
      .select('*', { count: 'exact', head: false })
      .eq('status', 'overdue');

    if (overduePaymentsCount && overduePaymentsCount > 0) {
      actions.push({
        id: 'overdue-payments',
        title: 'Overdue Payments',
        description: `${overduePaymentsCount} payments past due date`,
        count: overduePaymentsCount,
        priority: 'high',
        icon: 'Clock',
        route: '/dashboard/fees',
        category: 'fees',
      });
    }

    // 8. Pending Students (NORMAL priority)
    const { count: pendingStudentsCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: false })
      .eq('status', 'inactive');

    if (pendingStudentsCount && pendingStudentsCount > 0) {
      actions.push({
        id: 'pending-students',
        title: 'Inactive Students',
        description: `${pendingStudentsCount} students with inactive status`,
        count: pendingStudentsCount,
        priority: 'normal',
        icon: 'Users',
        route: '/dashboard/students',
        category: 'students',
      });
    }

  } catch (error) {
    console.error('Error fetching pending actions:', error);
  }

  // Sort by priority: urgent > high > normal > info
  const priorityOrder = { urgent: 0, high: 1, normal: 2, info: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions;
}

export async function getPendingActionsCount(): Promise<number> {
  const actions = await getAdminPendingActions();
  return actions.reduce((sum, action) => sum + action.count, 0);
}
