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
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-5 py-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-blue-200">
              Excellence Online College
            </p>
            <p className="text-sm font-bold">Student Identification Card</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-xs font-bold">
            EOC
          </div>
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
            <span className="text-2xl font-bold text-blue-700">{getInitials(fullName)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5 text-xs">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-400">Full Name</p>
            <p className="text-sm font-bold leading-tight text-slate-900">{fullName}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-400">Admission No.</p>
            <p className="font-mono text-sm font-bold text-blue-700">{admissionNumber}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-400">Program</p>
            <p className="font-medium leading-tight text-slate-800">{programName}</p>
            {programCode && <p className="text-slate-500">{programCode}</p>}
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-400">Enrolled</p>
            <p className="text-slate-700">{formatDate(student.enrollment_date)}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR Code" className="h-[72px] w-[72px]" />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[8px] text-slate-400">
              QR code
            </div>
          )}
          <span className="mt-1 text-center text-[7px] text-slate-400">Scan to verify</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-2">
        <p className="text-[9px] text-slate-500">Valid while enrolled · {student.status}</p>
        <p className="font-mono text-[9px] text-slate-400">ID: {student.id.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>
  );
}
