'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { Timetable, Program, Intake, TimeSlot } from '@/lib/types';
import {
  CollegeOfficialLetterhead,
  SCHOOL_NAME,
} from '@/components/documents/document-letterhead';
import {
  TIMETABLE_DAYS,
  TIMETABLE_DAY_LABELS,
  entriesForSlot,
  formatTimeRange,
  getDisplayTimeSlots,
  isPrimarySlotForEntry,
} from '@/lib/timetable-utils';
import { formatDate } from '@/lib/utils';

interface TimetablePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  timetables: Timetable[];
  program?: Program;
  intake?: Intake;
  academicYear?: string;
  timeSlots: TimeSlot[];
  isDraft?: boolean;
  autoPrint?: boolean;
  onPrinted?: () => void;
}

function venueLabel(entry: Timetable) {
  if (!entry.room?.name) return 'Online';
  return entry.room.building ? `${entry.room.name} (${entry.room.building})` : entry.room.name;
}

function printTitle(program?: Program, intake?: Intake) {
  return `Official Class Timetable${program ? ` - ${program.code}` : ''}${intake ? ` - ${intake.name}` : ''}`;
}

function printOfficialTimetable(title: string) {
  const originalTitle = document.title;
  document.title = title;
  document.body.classList.add('print-timetable');

  const pageStyle = document.createElement('style');
  pageStyle.id = 'timetable-print-page-style';
  pageStyle.textContent = '@page { size: A4 landscape; margin: 8mm 10mm; }';
  document.head.appendChild(pageStyle);

  const cleanup = () => {
    document.title = originalTitle;
    document.body.classList.remove('print-timetable');
    pageStyle.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.setTimeout(cleanup, 3000);
  window.print();
}

export function TimetablePrintDocument({
  timetables,
  program,
  intake,
  academicYear,
  timeSlots,
  generatedDate = new Date().toISOString(),
  documentId,
}: {
  timetables: Timetable[];
  program?: Program;
  intake?: Intake;
  academicYear?: string;
  timeSlots: TimeSlot[];
  generatedDate?: string;
  documentId?: string;
}) {
  const displaySlots = useMemo(() => getDisplayTimeSlots(timeSlots), [timeSlots]);
  const includesDraft = timetables.some((entry) => entry.status === 'draft');
  const generatedLabel = formatDate(generatedDate.split('T')[0]);

  return (
    <div
      id={documentId}
      className="print-document print-timetable-document bg-white text-slate-900"
    >
      <div className="print-timetable-heading">
        <CollegeOfficialLetterhead documentTitle="Official Class Timetable" compact />

        <table className="mt-2 w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Programme</p>
                <p className="font-medium">{program ? `${program.code} — ${program.name}` : 'All programmes'}</p>
              </td>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Intake</p>
                <p className="font-medium">{intake?.name || 'All intakes'}</p>
              </td>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Academic period</p>
                <p className="font-medium">{academicYear || intake?.academic_year || '—'}</p>
              </td>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Generated</p>
                <p className="font-medium">
                  {generatedLabel}
                  {includesDraft ? ' · Includes draft classes' : ''}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="print-timetable-table mt-2 w-full border-collapse text-[9px]">
        <thead>
          <tr>
            <th className="w-[54px] border border-slate-500 bg-slate-100 px-1 py-1 text-left font-semibold">
              Day
            </th>
            {displaySlots.map((slot) => (
              <th key={slot.id} className="border border-slate-500 bg-slate-100 px-1 py-1 text-center font-semibold">
                {slot.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMETABLE_DAYS.map((day) => (
            <tr key={day}>
              <td className="print-timetable-cell border border-slate-400 px-1 py-1 font-semibold" title={day}>
                {TIMETABLE_DAY_LABELS[day]}
              </td>
              {displaySlots.map((slot) => {
                const entries = entriesForSlot(timetables, day, slot).filter((entry) =>
                  isPrimarySlotForEntry(entry, slot)
                );
                return (
                  <td
                    key={`${day}-${slot.id}`}
                    className="print-timetable-cell h-14 align-top border border-slate-400 px-1 py-1"
                  >
                    {entries.map((entry) => (
                      <div key={entry.id} className="mb-1 last:mb-0">
                        <p className="font-bold leading-tight">{entry.course?.code}</p>
                        <p className="leading-tight">{entry.course?.name}</p>
                        <p className="leading-tight">{entry.lecturer?.full_name || '—'}</p>
                        <p className="leading-tight">{venueLabel(entry)}</p>
                        <p className="leading-tight">{formatTimeRange(entry.start_time, entry.end_time)}</p>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-center text-[8px] text-slate-500">
        {SCHOOL_NAME} · Official Class Timetable · {generatedLabel}
      </p>
    </div>
  );
}

export function TimetablePreview({
  isOpen,
  onClose,
  timetables,
  program,
  intake,
  academicYear,
  timeSlots,
  autoPrint = false,
  onPrinted,
}: TimetablePreviewProps) {
  const documentProps = {
    timetables,
    program,
    intake,
    academicYear,
    timeSlots,
  };

  const autoPrinted = useRef(false);

  function handlePrint() {
    printOfficialTimetable(printTitle(program, intake));
    onPrinted?.();
  }

  useEffect(() => {
    if (!isOpen) {
      autoPrinted.current = false;
      return;
    }
    if (!autoPrint || autoPrinted.current) return;
    autoPrinted.current = true;
    const timer = window.setTimeout(() => {
      printOfficialTimetable(printTitle(program, intake));
      onPrinted?.();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [isOpen, autoPrint, program, intake, onPrinted]);

  if (!isOpen) return null;

  return (
    <>
      <Modal open={isOpen} onClose={onClose} size="full">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Preview Timetable</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
            <TimetablePrintDocument {...documentProps} />
          </div>
        </div>
      </Modal>
      {createPortal(
        <div id="timetable-print-root">
          <TimetablePrintDocument {...documentProps} documentId="official-class-timetable" />
        </div>,
        document.body
      )}
    </>
  );
}
