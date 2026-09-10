import { getMyStudentRecord } from '@/app/actions/student-self';
import { redirect } from 'next/navigation';
import { getLearningActivityById } from '@/app/actions/lms';
import { StudentActivityViewerClient } from '@/components/lms/student-activity-viewer-client';

export default async function StudentActivityViewerPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

  const activity = await getLearningActivityById(activityId);
  if (!activity) {
    redirect('/student/lms/my-learning');
  }

  return <StudentActivityViewerClient student={student} activity={activity} />;
}
