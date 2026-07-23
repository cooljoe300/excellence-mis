import { notFound } from 'next/navigation';
import { getStudent } from '@/app/actions/students';
import { getEnrollmentsForStudent } from '@/app/actions/enrollments';
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

  const enrollments = await getEnrollmentsForStudent(id);

  return (
    <AdmissionLetter student={student} enrollments={enrollments} />
  );
}
