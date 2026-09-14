import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { getStudentTimetable } from '@/app/actions/timetable';
import { createClient } from '@/lib/supabase/server';
import { StudentTimetableGrid } from '@/components/timetable/student-timetable-grid';

export default async function StudentTimetablePage() {
  const supabase = await createClient();
  const { data: { user } } = await (supabase.auth as any).getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { student, timetables, timeSlots, programme, intake } = await getStudentTimetable();

  if (!student) {
    redirect('/student/register');
  }

  return (
    <div>
      <PageHeader
        title="My Timetable"
        description="View your class schedule based on enrolled units"
      />

      <StudentTimetableGrid
        timetables={timetables}
        timeSlots={timeSlots}
        studentName={`${student.first_name} ${student.last_name}`}
        studentNumber={student.student_number || student.admission_number || 'N/A'}
        programmeName={student.program?.name || 'Not assigned'}
        programme={programme || undefined}
        intake={intake || undefined}
      />
    </div>
  );
}
