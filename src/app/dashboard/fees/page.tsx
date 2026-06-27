import {
  getFeePayments,
  getPendingFeePaymentSubmissions,
  checkPaymentApprovalSetup,
} from '@/app/actions/fees';
import { getStudents } from '@/app/actions/students';
import { getAcademicTerms } from '@/app/actions/enrollments';
import { FeesClient } from '@/components/fees/fees-client';
import type { FeePayment, FeePaymentSubmission, Student } from '@/lib/types';

export default async function FeesPage() {
  const [fees, students, terms, pendingRaw, approvalSetup] = await Promise.all([
    getFeePayments(),
    getStudents(),
    getAcademicTerms(),
    getPendingFeePaymentSubmissions(),
    checkPaymentApprovalSetup(),
  ]);

  const pendingApprovals = pendingRaw.map((row) => {
    const submission = row as FeePaymentSubmission;
    const fee = (row.fee_payment ?? {}) as FeePayment;
    const student = (row.student ?? fee.student ?? {}) as Student;
    return { submission, fee, student };
  });

  return (
    <FeesClient
      fees={fees}
      students={students}
      terms={terms}
      pendingApprovals={pendingApprovals}
      approvalSetup={approvalSetup}
    />
  );
}
