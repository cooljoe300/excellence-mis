import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getStudent } from '@/app/actions/students';
import { formatDate, getInitials } from '@/lib/utils';
import { PrintIdCardButton } from '@/components/students/print-id-card-button';

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

  const admissionNumber = student.admission_number ?? student.student_number;
  const programName = (student.program as { name: string; code: string } | null)?.name ?? '—';
  const programCode = (student.program as { name: string; code: string } | null)?.code ?? '';
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

      {/* ID Card — standard CR80 size ratio */}
      <div
        id="student-id-card"
        className="mx-auto w-[340px] overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-xl print:shadow-none print:border-slate-400"
        style={{ aspectRatio: '1.586 / 1' }}
      >
        {/* Header */}
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

        {/* Body */}
        <div className="flex gap-4 px-5 py-4">
          {/* Photo */}
          <div className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
            {student.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.photo_url}
                alt={fullName}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-blue-700">
                {getInitials(fullName)}
              </span>
            )}
            <span className="mt-1 text-[8px] text-slate-400 uppercase">Photo</span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1.5 text-xs">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-400">Full Name</p>
              <p className="font-bold text-slate-900 text-sm leading-tight">{fullName}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-400">Admission No.</p>
              <p className="font-mono font-bold text-blue-700 text-sm">{admissionNumber}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-400">Program</p>
              <p className="font-medium text-slate-800 leading-tight">{programName}</p>
              {programCode && <p className="text-slate-500">{programCode}</p>}
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-400">Enrolled</p>
              <p className="text-slate-700">{formatDate(student.enrollment_date)}</p>
            </div>
          </div>

          {/* QR */}
          <div className="shrink-0 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code" className="h-[72px] w-[72px]" />
            <span className="mt-1 text-[7px] text-slate-400 text-center">Scan to verify</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 flex items-center justify-between">
          <p className="text-[9px] text-slate-500">
            Valid while enrolled · {student.status}
          </p>
          <p className="text-[9px] font-mono text-slate-400">
            ID: {student.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-md text-center text-xs text-slate-500 print:hidden">
        Card auto-generated on registration. Use Print to produce a physical ID card.
      </p>
    </div>
  );
}
