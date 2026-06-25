import { getFeePayments } from '@/app/actions/fees';
import { getStudents } from '@/app/actions/students';
import { getAcademicTerms } from '@/app/actions/enrollments';
import { FeesClient } from '@/components/fees/fees-client';

export default async function FeesPage() {
  const [fees, students, terms] = await Promise.all([
    getFeePayments(),
    getStudents(),
    getAcademicTerms(),
  ]);

  return <FeesClient fees={fees} students={students} terms={terms} />;
}
