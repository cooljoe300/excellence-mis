import { notFound } from 'next/navigation';
import { getStudent } from '@/app/actions/students';
import { PageHeader } from '@/components/ui/page-header';
import { AdmissionLetter } from '@/components/students/admission-letter';

export default async function AdmissionLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let student;
  try {
    student = await getStudent(id);
  } catch {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title="Admission Letter"
        description={`Official admission letter for ${student.first_name} ${student.last_name}`}
      />
      <AdmissionLetter student={student} />
    </div>
  );
}
