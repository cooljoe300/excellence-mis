import Image from 'next/image';
import { formatDate, getAdmissionNumber, getInitials } from '@/lib/utils';
import {
  SCHOOL_ADDRESS,
  SCHOOL_NAME,
  SCHOOL_WEBSITE,
} from '@/components/documents/document-letterhead';
import type { Student } from '@/lib/types';

const CARD_CLASS =
  'student-id-card-face mx-auto w-[340px] overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-xl print:shadow-none print:border-slate-400';
const CARD_STYLE = { aspectRatio: '1.586 / 1' as const, minHeight: '214px' as const };

const PROPERTY_NOTICE =
  'This Card is the property of Excellence Online College and should be surrendered on expiry or on demand';

function StudentIdCardFront({
  student,
  qrDataUrl,
}: {
  student: Student;
  qrDataUrl?: string | null;
}) {
  const admissionNumber = getAdmissionNumber(student);
  const programName = (student.program as { name: string; code: string } | null)?.name ?? '—';
  const programCode = (student.program as { name: string; code: string } | null)?.code ?? '';
  const fullName = `${student.first_name} ${student.last_name}`;

  return (
    <div className={CARD_CLASS} style={CARD_STYLE}>
      <div className="bg-gradient-to-r from-[#003380] to-[#004a99] px-5 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-[#e1a916]">
              {SCHOOL_NAME}
            </p>
            <p className="text-sm font-bold">Student Identification Card</p>
          </div>
          <Image
            src="/logo.png"
            alt={SCHOOL_NAME}
            width={48}
            height={42}
            className="h-9 w-auto rounded bg-white px-1 py-0.5 object-contain"
          />
        </div>
      </div>

      <div className="flex gap-4 px-5 py-4">
        <div className="flex h-24 w-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          {student.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.photo_url}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-primary">{getInitials(fullName)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Name</p>
            <p className="font-semibold text-slate-900 leading-tight">{fullName}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Admission No.</p>
            <p className="font-mono text-sm font-bold text-primary">{admissionNumber}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Program</p>
            <p className="text-slate-700 leading-tight">
              {programCode ? `${programCode} — ` : ''}{programName}
            </p>
          </div>
          {student.enrollment_date && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Enrolled</p>
              <p className="text-slate-700">{formatDate(student.enrollment_date)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
        <div className="text-[10px] text-slate-500">
          <p>Valid while enrolled at EOC</p>
          {student.id_card_issued_at && (
            <p className="mt-0.5">Issued {formatDate(student.id_card_issued_at)}</p>
          )}
        </div>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Student QR code" className="h-14 w-14" />
        )}
      </div>
    </div>
  );
}

function StudentIdCardBack() {
  return (
    <div className={`${CARD_CLASS} flex h-full flex-col`} style={CARD_STYLE}>
      <div className="shrink-0 bg-gradient-to-r from-[#003380] to-[#004a99] px-4 py-1.5 text-center text-white">
        <p className="text-[9px] font-medium uppercase tracking-widest text-[#e1a916]">
          Official College Information
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-2 text-center">
        <Image
          src="/logo.png"
          alt={SCHOOL_NAME}
          width={56}
          height={50}
          className="h-10 w-auto object-contain"
        />
        <p className="mt-1.5 text-sm font-bold leading-tight text-[#003380]">{SCHOOL_NAME}</p>
        <p className="mt-1 text-[10px] text-slate-600">{SCHOOL_ADDRESS}</p>
        <p className="text-[10px] text-slate-600">{SCHOOL_WEBSITE}</p>
      </div>

      <div className="student-id-card-property-notice shrink-0 border-t border-slate-200 bg-white px-3 py-2">
        <p className="text-center text-[9px] font-semibold leading-snug text-red-600">
          {PROPERTY_NOTICE}
        </p>
      </div>
    </div>
  );
}

export function StudentIdCardDocument({
  student,
  qrDataUrl,
}: {
  student: Student;
  qrDataUrl?: string | null;
}) {
  return (
    <div id="student-id-card" className="mx-auto flex max-w-[340px] flex-col gap-6">
      <div className="student-id-card-page print:break-after-page">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400 print:hidden">
          Front
        </p>
        <StudentIdCardFront student={student} qrDataUrl={qrDataUrl} />
      </div>

      <div className="student-id-card-page">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400 print:hidden">
          Back
        </p>
        <StudentIdCardBack />
      </div>
    </div>
  );
}