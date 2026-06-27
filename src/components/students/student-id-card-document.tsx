import Image from 'next/image';
import { formatDate, getAdmissionNumber, getInitials } from '@/lib/utils';
import type { Student } from '@/lib/types';

export function StudentIdCardDocument({
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
    <div
      id="student-id-card"
      className="mx-auto w-[340px] overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-xl print:shadow-none print:border-slate-400"
      style={{ aspectRatio: '1.586 / 1' }}
    >
      <div className="bg-gradient-to-r from-[#003380] to-[#004a99] px-5 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-[#e1a916]">
              Excellence Online College
            </p>
            <p className="text-sm font-bold">Student Identification Card</p>
          </div>
          <Image
            src="/logo.png"
            alt="Excellence Online College"
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