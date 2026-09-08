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
import { getDisplayTimeSlots } from '@/lib/timetable-utils';
import { printTimetableDocument } from '@/lib/print-timetable';
import { formatDate } from '@/lib/utils';
import { TimetableWeekTable } from './timetable-day-track';

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

function printTitle(program?: Program, intake?: Intake) {
  return `Official Class Timetable${program ? ` - ${program.code}` : ''}${intake ? ` - ${intake.name}` : ''}`;
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

      <TimetableWeekTable
        slots={displaySlots}
        entries={timetables}
        variant="print"
        compact
        tableClassName="print-timetable-table mt-2 w-full table-fixed border-collapse text-[9px]"
      />

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
    printTimetableDocument(printTitle(program, intake));
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
      printTimetableDocument(printTitle(program, intake));
      onPrinted?.();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [isOpen, autoPrint, program, intake, onPrinted]);

  if (!isOpen) return null;

  return (
    <>
      <Modal open={isOpen} onClose={onClose} size="full">
        <div className="space-y-4">
          <div className="no-print flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Preview Timetable</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print Timetable
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
        <div
          id="timetable-print-root"
          className="timetable-print-container"
        >
          <TimetablePrintDocument {...documentProps} documentId="official-class-timetable" />
        </div>,
        document.body
      )}
    </>
  );
}
