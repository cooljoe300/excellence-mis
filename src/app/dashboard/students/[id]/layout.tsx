import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getStudent } from '@/app/actions/students';
import { StudentDetailHeader } from '@/components/students/student-detail-header';
import { StudentDetailNav } from '@/components/students/student-detail-nav';

export default async function StudentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
      <StudentDetailHeader student={student} />
      <Suspense fallback={<div className="mb-6 h-10 animate-pulse rounded bg-slate-100" />}>
        <StudentDetailNav studentId={id} />
      </Suspense>
      {children}
    </div>
  );
}
