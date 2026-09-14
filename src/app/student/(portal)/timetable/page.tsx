import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { getStudentTimetableClean } from '@/app/actions/student-timetable-new';
import { StudentTimetableClean } from '@/components/timetable/student-timetable-clean';

export default async function StudentTimetablePage() {
  const data = await getStudentTimetableClean();

  // If not authenticated, redirect to login
  if ('error' in data && data.error.includes('sign in')) {
    redirect('/login');
  }

  // If student record not found, redirect to registration
  if ('error' in data && data.error.includes('Student record not found')) {
    redirect('/student/register');
  }

  return (
    <div>
      <PageHeader
        title="My Timetable"
        description="View your class schedule based on enrolled units"
      />

      <StudentTimetableClean data={data} />
    </div>
  );
}
