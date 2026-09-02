import { redirect } from 'next/navigation';
import { getStudentDashboardData } from '@/app/actions/student-dashboard';
import { StudentWelcome } from '@/components/student/student-welcome';
import { ActionCenter } from '@/components/student/action-center';
import { SummaryCards } from '@/components/student/summary-cards';
import { AcademicSummary } from '@/components/student/academic-summary';
import { CurrentUnits } from '@/components/student/current-units';
import { FinancialSummary } from '@/components/student/financial-summary';
import { AcademicProgress } from '@/components/student/academic-progress';
import { QuickServices } from '@/components/student/quick-services';
import { LMSAccess } from '@/components/student/lms-access';
import { StudentSupport } from '@/components/student/student-support';

export default async function StudentDashboardPage() {
  const dashboardData = await getStudentDashboardData();

  if (!dashboardData.student) {
    redirect('/student/register');
  }

  return (
    <div className="space-y-6">
      <StudentWelcome student={dashboardData.student} />
      
      {dashboardData.actions.length > 0 && (
        <ActionCenter actions={dashboardData.actions} />
      )}
      
      <SummaryCards summary={dashboardData.summary} />
      
      <AcademicSummary 
        student={dashboardData.student}
        currentTerm={dashboardData.currentTerm}
      />
      
      <CurrentUnits 
        enrollments={dashboardData.currentEnrollments}
        currentTerm={dashboardData.currentTerm}
      />
      
      <FinancialSummary 
        summary={dashboardData.summary}
        feePayments={dashboardData.feePayments}
      />
      
      <AcademicProgress 
        progress={dashboardData.academicProgress}
        enrollments={dashboardData.currentEnrollments}
      />
      
      <QuickServices />
      
      <LMSAccess 
        lmsSynced={dashboardData.summary.lmsSynced}
        lmsUsername={dashboardData.student.lms_username}
      />
      
      <StudentSupport />
    </div>
  );
}