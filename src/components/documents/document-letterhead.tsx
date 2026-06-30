import Image from 'next/image';
import type { ReactNode } from 'react';

export const SCHOOL_NAME = 'Excellence Online College';
export const SCHOOL_ADDRESS = 'Nairobi, Kenya';
export const SCHOOL_WEBSITE = 'excellenceonlinecollege.com';

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
