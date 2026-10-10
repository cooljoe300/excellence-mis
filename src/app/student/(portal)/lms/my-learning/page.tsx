import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getRoleFromMetadata } from '@/lib/auth';
import { StudentMyLearningClient } from '@/components/lms/student-my-learning-client';
import type { Student } from '@/lib/types';
import { logAudit } from '@/lib/audit-logger';

export default async function StudentMyLearningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  if (!user) redirect('/login');

  const metaRole = getRoleFromMetadata(user.user_metadata);
  if (metaRole && metaRole !== 'student') redirect('/dashboard');

  // Get student data
  const { data: student } = await supabase
    .from('students')
    .select('*, profile:profiles(*), program:programs(*), intake:intakes(*)')
    .eq('profile_id', user.id)
    .single();

  if (!student) {
    redirect('/student/dashboard');
  }

  // Log that student opened LMS
  await logAudit({
    action: 'view',
    module: 'lms',
    entityType: 'lms',
    entityId: student.id,
    entityName: `${student.first_name} ${student.last_name}`,
    details: 'Student opened My Learning',
    actorType: 'STUDENT',
  });

  return <StudentMyLearningClient student={student as Student} />;
}
