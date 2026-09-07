import Image from 'next/image';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
  compact = false,
}: {
  documentTitle: string;
  compact?: boolean;
}) {
  return (
    <header
      className={cn(
        'document-letterhead border-b-2 border-slate-900 text-center',
        compact ? 'pb-1.5' : 'pb-3'
      )}
    >
      <div className={cn('flex justify-center', compact ? 'mb-0.5' : 'mb-1')}>
        <Image
          src="/logo.png"
          alt={SCHOOL_NAME}
          width={compact ? 40 : 56}
          height={compact ? 40 : 56}
          className={cn('object-contain', compact ? 'h-10 w-10' : 'h-14 w-14')}
        />
      </div>
      <p className={cn('font-bold leading-tight text-slate-900', compact ? 'text-base' : 'text-xl')}>
        {SCHOOL_NAME_OFFICIAL}
      </p>
      <p className={cn('text-slate-600', compact ? 'text-[8px]' : 'mt-0.5 text-[10px]')}>{SCHOOL_TAGLINE}</p>
      <p className={cn('text-slate-500', compact ? 'mt-0.5 text-[8px]' : 'mt-1 text-[9px]')}>
        {SCHOOL_CAMPUS} | {SCHOOL_CITY}, {SCHOOL_COUNTRY} | Tel: {SCHOOL_PHONE} | Email: {SCHOOL_EMAIL}
      </p>
      {!compact && <p className="text-[9px] text-slate-500">{SCHOOL_WEBSITE}</p>}
      <h1
        className={cn(
          'font-bold tracking-wide text-slate-900',
          compact ? 'mt-1.5 text-sm uppercase' : 'mt-3 text-lg underline underline-offset-4'
        )}
      >
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
