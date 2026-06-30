import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getStudent } from '@/app/actions/students';
import { StudentIdCardDocument } from '@/components/students/student-id-card-document';
import { PrintIdCardButton } from '@/components/students/print-id-card-button';
import { getAdmissionNumber } from '@/lib/utils';
import type { Student } from '@/lib/types';

export default async function IdCardPage({
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

  const admissionNumber = getAdmissionNumber(student);
  const fullName = `${student.first_name} ${student.last_name}`;

  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify({
      admission: admissionNumber,
      name: fullName,
      email: student.email,
      college: 'Excellence Online College',
    }),
    { width: 120, margin: 1 }
  );

  return (
    <div className="bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mb-4 max-w-md print:hidden">
        <PrintIdCardButton />
      </div>

      <StudentIdCardDocument student={student as Student} qrDataUrl={qrDataUrl} />

      <p className="mx-auto mt-4 max-w-md text-center text-xs text-slate-500 print:hidden">
        Card auto-generated on registration. Print both sides for a physical ID card.
      </p>
    </div>
  );
}
