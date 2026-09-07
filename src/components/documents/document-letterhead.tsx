import Image from 'next/image';
import type { ReactNode } from 'react';

export const SCHOOL_NAME = 'Excellence Online College';
export const SCHOOL_NAME_OFFICIAL = 'EXCELLENCE ONLINE COLLEGE';
export const SCHOOL_TAGLINE = 'Excellence Through Quality Education';
export const SCHOOL_CAMPUS = 'Main Campus';
export const SCHOOL_CITY = 'Nairobi';
export const SCHOOL_COUNTRY = 'Kenya';
export const SCHOOL_ADDRESS = 'Main Campus | Nairobi, Kenya';
export const SCHOOL_PHONE = '+254 711 552570';
export const SCHOOL_EMAIL = 'info@excellencecollege.ac.ke';
export const SCHOOL_WEBSITE = 'www.excellencecollege.ac.ke';

export function CollegeOfficialLetterhead({
  documentTitle,
}: {
  documentTitle: string;
}) {
  return (
    <header className="document-letterhead border-b-2 border-slate-900 pb-3 text-center">
      <div className="mb-1 flex justify-center">
        <Image
          src="/logo.png"
          alt={SCHOOL_NAME}
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
        />
      </div>
      <p className="text-xl font-bold leading-tight text-slate-900">{SCHOOL_NAME_OFFICIAL}</p>
      <p className="mt-0.5 text-[10px] text-slate-600">{SCHOOL_TAGLINE}</p>
      <p className="mt-1 text-[9px] text-slate-500">
        {SCHOOL_CAMPUS} | {SCHOOL_CITY}, {SCHOOL_COUNTRY} | Tel: {SCHOOL_PHONE} | Email: {SCHOOL_EMAIL}
      </p>
      <p className="text-[9px] text-slate-500">{SCHOOL_WEBSITE}</p>
      <h1 className="mt-3 text-lg font-bold tracking-wide text-slate-900 underline underline-offset-4">
        {documentTitle}
      </h1>
    </header>
  );
}

export function DocumentLetterhead({
  documentTitle,
  documentSubtitle,
  rightMeta,
}: {
  documentTitle: string;
  documentSubtitle?: string;
  rightMeta?: ReactNode;
}) {
  return (
    <header className="document-letterhead border-b-2 border-slate-200 pb-5">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt={SCHOOL_NAME}
            width={72}
            height={72}
            className="h-16 w-16 shrink-0 object-contain"
          />
          <div>
            <p className="text-lg font-bold leading-tight text-slate-900">{SCHOOL_NAME}</p>
            <p className="mt-0.5 text-xs text-slate-500">{SCHOOL_ADDRESS}</p>
            <p className="text-xs text-slate-500">{SCHOOL_WEBSITE}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold text-slate-900">{documentTitle}</h1>
          {documentSubtitle && (
            <p className="mt-0.5 text-sm text-slate-500">{documentSubtitle}</p>
          )}
          {rightMeta && <div className="mt-2 text-sm text-slate-600">{rightMeta}</div>}
        </div>
      </div>
    </header>
  );
}
