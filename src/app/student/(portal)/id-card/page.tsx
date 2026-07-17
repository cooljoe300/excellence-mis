import { redirect } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { StudentIdCardDocument } from '@/components/students/student-id-card-document';
import { PrintIdCardButton } from '@/components/students/print-id-card-button';
import { Button } from '@/components/ui/button';
import { getAdmissionNumber } from '@/lib/utils';
import type { Student } from '@/lib/types';

export default async function StudentIdCardPage() {
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

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
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/student">
          <Button variant="secondary" size="sm">
            Back to portal
          </Button>
        </Link>
        <PrintIdCardButton />
      </div>

      {!student.photo_url && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 print:hidden">
          Upload a passport photo under{' '}
          <Link href="/student/register" className="font-medium underline">
            Update my details
          </Link>{' '}
          to show your photo on this card.
        </div>
      )}

      <StudentIdCardDocument student={student as Student} qrDataUrl={qrDataUrl} />

      <p className="mx-auto mt-3 max-w-sm text-center text-[11px] text-slate-500 print:hidden">
        The card has a front and back. Use Print to download or print both sides.
      </p>
    </div>
  );
}
