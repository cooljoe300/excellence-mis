import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTimetableFormData } from '@/app/actions/timetable';
import { createTimetable } from '@/app/actions/timetable';
import { TimetableForm } from '@/components/timetable/timetable-form';

export default async function NewTimetablePage() {
  const formData = await getTimetableFormData();

  return (
    <div>
      <PageHeader
        title="Add Timetable Entry"
        description="Schedule a new class in the timetable"
      />

      <Card>
        <CardHeader>
          <CardTitle>Class Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TimetableForm
            programs={formData.programs}
            courses={formData.courses}
            lecturers={formData.lecturers}
            timeSlots={formData.timeSlots}
            intakes={formData.intakes}
            action={createTimetable}
          />
        </CardContent>
      </Card>
    </div>
  );
}
