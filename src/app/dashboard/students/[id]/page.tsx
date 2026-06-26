import { notFound } from 'next/navigation';
import { getStudent } from '@/app/actions/students';
import { getPrograms } from '@/app/actions/programs';
import { getIntakes } from '@/app/actions/intakes';
import { StudentForm } from '@/components/students/student-form';
import { StudentProfileView } from '@/components/students/student-profile-view';
import { isSelfRegisteredStudent } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; registered?: string }>;
}) {
  const { id } = await params;
  const { edit, registered } = await searchParams;

  let student;
  try {
    student = await getStudent(id);
  } catch {
    notFound();
  }

  if (edit === 'true') {
    const [programs, intakes] = await Promise.all([getPrograms(), getIntakes()]);
    return (
      <div>
        <PageHeader
          title="Edit Student"
          description={`${student.first_name} ${student.last_name}`}
        />
        <StudentForm programs={programs} intakes={intakes} student={student} />
      </div>
    );
  }

  return (
    <StudentProfileView
      student={student}
      justRegistered={registered === 'true'}
      selfRegistered={isSelfRegisteredStudent(student)}
    />
  );
}
