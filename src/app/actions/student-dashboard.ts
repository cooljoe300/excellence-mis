'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentAcademicTermId } from '@/app/actions/enrollments';
import type { Student, Enrollment, FeePayment, AcademicTerm, Program, Intake } from '@/lib/types';

export interface StudentDashboardData {
  student: Student | null;
  currentTerm: AcademicTerm | null;
  currentEnrollments: Enrollment[];
  feePayments: FeePayment[];
  academicProgress: {
    totalEnrollments: number;
    gradedEnrollments: number;
    averageScore: number;
    gradeDistribution: Record<string, number>;
  };
  summary: {
    semesterName: string | null;
    registeredUnitsCount: number;
    totalFees: number;
    feesPaid: number;
    feesBalance: number;
    lmsSynced: boolean;
    lmsFailed: boolean;
    idCardReady: boolean;
    profileComplete: number;
  };
  actions: DashboardAction[];
}

export interface DashboardAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'normal';
  action: string;
  actionLabel: string;
  actionHref: string;
}

export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();
  
  if (!user) {
    return {
      student: null,
      currentTerm: null,
      currentEnrollments: [],
      feePayments: [],
      academicProgress: {
        totalEnrollments: 0,
        gradedEnrollments: 0,
        averageScore: 0,
        gradeDistribution: {},
      },
      summary: {
        semesterName: null,
        registeredUnitsCount: 0,
        totalFees: 0,
        feesPaid: 0,
        feesBalance: 0,
        lmsSynced: false,
        lmsFailed: false,
        idCardReady: false,
        profileComplete: 0,
      },
      actions: [],
    };
  }

  // Fetch student with program and intake
  const { data: student } = await supabase
    .from('students')
    .select('*, program:programs(*), intake:intakes(*)')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!student) {
    return {
      student: null,
      currentTerm: null,
      currentEnrollments: [],
      feePayments: [],
      academicProgress: {
        totalEnrollments: 0,
        gradedEnrollments: 0,
        averageScore: 0,
        gradeDistribution: {},
      },
      summary: {
        semesterName: null,
        registeredUnitsCount: 0,
        totalFees: 0,
        feesPaid: 0,
        feesBalance: 0,
        lmsSynced: false,
        lmsFailed: false,
        idCardReady: false,
        profileComplete: 0,
      },
      actions: [],
    };
  }

  // Fetch current academic term
  const termId = await getCurrentAcademicTermId();
  let currentTerm: AcademicTerm | null = null;
  
  if (termId) {
    const { data: term } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('id', termId)
      .single();
    currentTerm = term;
  }

  // Fetch enrollments for current term with courses
  let enrollmentsQuery = supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('student_id', student.id);

  if (termId) {
    enrollmentsQuery = enrollmentsQuery.eq('term_id', termId);
  }

  const { data: currentEnrollments } = await enrollmentsQuery;

  // Fetch fee payments for current term
  let feePaymentsQuery = supabase
    .from('fee_payments')
    .select('*')
    .eq('student_id', student.id);

  if (termId) {
    feePaymentsQuery = feePaymentsQuery.eq('term_id', termId);
  }

  const { data: feePayments } = await feePaymentsQuery;

  // Calculate academic progress
  const allEnrollments = currentEnrollments ?? [];
  const gradedEnrollments = allEnrollments.filter(e => e.grade && e.status === 'completed');
  const averageScore = gradedEnrollments.length > 0
    ? gradedEnrollments.reduce((sum, e) => sum + (e.score ?? 0), 0) / gradedEnrollments.length
    : 0;

  const gradeDistribution: Record<string, number> = gradedEnrollments.reduce((acc, e) => {
    const grade = e.grade || 'N/A';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate financial summary
  const payments = feePayments ?? [];
  const totalFees = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const feesPaid = payments.reduce((sum, p) => {
    // Only count paid or partial status
    if (p.status === 'paid' || p.status === 'partial') {
      return sum + Number(p.amount_paid);
    }
    return sum;
  }, 0);
  const feesBalance = Math.max(0, totalFees - feesPaid);

  // Calculate profile completion
  const profileComplete = calculateProfileCompletion(student);

  // Generate actions based on student state
  const actions = generateDashboardActions(student, currentEnrollments ?? [], payments, currentTerm);

  return {
    student,
    currentTerm,
    currentEnrollments: currentEnrollments ?? [],
    feePayments: payments,
    academicProgress: {
      totalEnrollments: allEnrollments.length,
      gradedEnrollments: gradedEnrollments.length,
      averageScore,
      gradeDistribution,
    },
    summary: {
      semesterName: currentTerm?.name ?? null,
      registeredUnitsCount: allEnrollments.length,
      totalFees,
      feesPaid,
      feesBalance,
      lmsSynced: student.lms_sync_status === 'synced',
      lmsFailed: student.lms_sync_status === 'failed',
      idCardReady: !!student.id_card_issued_at && !!student.photo_url,
      profileComplete,
    },
    actions,
  };
}

function calculateProfileCompletion(student: Student): number {
  const requiredFields = [
    'first_name',
    'last_name',
    'email',
  ];
  
  const optionalFields = [
    'phone',
    'date_of_birth',
    'gender',
    'nationality',
    'address',
    'emergency_contact_name',
    'emergency_contact_phone',
    'photo_url',
  ];

  let completed = 0;
  let total = requiredFields.length + optionalFields.length;

  // Check required fields (weighted more heavily)
  requiredFields.forEach(field => {
    if (student[field as keyof Student]) {
      completed += 2; // Required fields count double
    }
  });

  // Check optional fields
  optionalFields.forEach(field => {
    if (student[field as keyof Student]) {
      completed += 1;
    }
  });

  return Math.min(100, Math.round((completed / (requiredFields.length * 2 + optionalFields.length)) * 100));
}

function generateDashboardActions(
  student: Student,
  enrollments: Enrollment[],
  feePayments: FeePayment[],
  currentTerm: AcademicTerm | null
): DashboardAction[] {
  const actions: DashboardAction[] = [];

  // Check profile completion
  const profileComplete = calculateProfileCompletion(student);
  if (profileComplete < 80) {
    actions.push({
      id: 'complete-profile',
      title: 'Complete your profile',
      description: 'Your profile is incomplete. Please add missing information.',
      priority: 'high',
      action: 'Complete Profile',
      actionLabel: 'Complete Profile',
      actionHref: '/student/register',
    });
  }

  // Check unit registration
  if (enrollments.length === 0 && currentTerm) {
    actions.push({
      id: 'register-units',
      title: 'Register units',
      description: `You haven't registered any units for ${currentTerm.name}.`,
      priority: 'high',
      action: 'Register Units',
      actionLabel: 'Register Units',
      actionHref: '/student/enroll',
    });
  }

  // Check fee balance
  const totalFees = feePayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const feesPaid = feePayments.reduce((sum, p) => {
    if (p.status === 'paid' || p.status === 'partial') {
      return sum + Number(p.amount_paid);
    }
    return sum;
  }, 0);
  const balance = Math.max(0, totalFees - feesPaid);

  if (balance > 0) {
    actions.push({
      id: 'pay-fees',
      title: 'Pay outstanding fees',
      description: `You have an outstanding balance of KSh ${balance.toLocaleString()}.`,
      priority: 'high',
      action: 'Pay Fees',
      actionLabel: 'Pay Fees',
      actionHref: '/student/fees',
    });
  }

  // Check ID card
  if (!student.id_card_issued_at) {
    actions.push({
      id: 'id-card-pending',
      title: 'ID Card Pending',
      description: 'Your ID card is being processed by administration.',
      priority: 'medium',
      action: 'View Status',
      actionLabel: 'View Status',
      actionHref: '/student/id-card',
    });
  } else if (!student.photo_url) {
    actions.push({
      id: 'add-photo',
      title: 'Add passport photo',
      description: 'Add your passport photo to complete your ID card.',
      priority: 'medium',
      action: 'Add Photo',
      actionLabel: 'Add Photo',
      actionHref: '/student/register',
    });
  }

  // Check LMS sync
  if (student.lms_sync_status === 'failed') {
    actions.push({
      id: 'lms-failed',
      title: 'LMS sync failed',
      description: 'Your LMS account creation failed. Please contact administration.',
      priority: 'high',
      action: 'Contact Support',
      actionLabel: 'Contact Support',
      actionHref: '/student',
    });
  } else if (student.lms_sync_status === 'not_synced') {
    actions.push({
      id: 'lms-pending',
      title: 'LMS account pending',
      description: 'Your LMS account is being created.',
      priority: 'normal',
      action: 'View Status',
      actionLabel: 'View Status',
      actionHref: '/student',
    });
  }

  // Check for new results
  const gradedEnrollments = enrollments.filter(e => e.grade && e.status === 'completed');
  if (gradedEnrollments.length > 0) {
    actions.push({
      id: 'view-results',
      title: 'View your results',
      description: `You have ${gradedEnrollments.length} graded units available.`,
      priority: 'normal',
      action: 'View Results',
      actionLabel: 'View Results',
      actionHref: '/student/exam-results',
    });
  }

  return actions;
}