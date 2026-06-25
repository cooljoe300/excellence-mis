import { getAttendance } from '@/app/actions/attendance';
import { getEnrollments } from '@/app/actions/enrollments';
import { AttendanceClient } from '@/components/attendance/attendance-client';

export default async function AttendancePage() {
  const [attendance, enrollments] = await Promise.all([
    getAttendance(),
    getEnrollments(),
  ]);

  return <AttendanceClient attendance={attendance} enrollments={enrollments} />;
}
