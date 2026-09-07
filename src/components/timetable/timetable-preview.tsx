'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Printer, Link } from 'lucide-react';
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
import { getProgrammeColourClasses, getSharedClassColourClasses } from '@/lib/programme-colours';

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

function getEntryColourClasses(entry: Timetable): {
  border: string;
  background: string;
  text: string;
  badge: string;
} {
  // Use shared class colour for shared classes
  if (entry.class_type === 'shared') {
    return getSharedClassColourClasses();
  }

  // Use programme colour for regular classes
  const programmeId = entry.program_id || (entry.programme_assignments?.[0]?.programme_id);
  const programmeName = entry.program?.name || entry.programme_assignments?.[0]?.programme?.name;
  return getProgrammeColourClasses(programmeId, programmeName);
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
                
                // Group entries by programme for better separation
                const entriesByProgramme = entries.reduce((acc, entry) => {
                  const programmeId = entry.program_id || (entry.programme_assignments?.[0]?.programme_id) || 'unknown';
                  if (!acc[programmeId]) {
                    acc[programmeId] = [];
                  }
                  acc[programmeId].push(entry);
                  return acc;
                }, {} as Record<string, Timetable[]>);
                
                const programmeIds = Object.keys(entriesByProgramme);
                
                return (
                  <td
                    key={`${day}-${slot.id}`}
                    className="print-timetable-cell h-14 align-top border border-slate-400 px-1 py-1"
                  >
                    {programmeIds.map((progId, progIndex) => {
                      const programmeEntries = entriesByProgramme[progId];
                      const isFirstProgramme = progIndex === 0;
                      
                      return (
                        <div key={progId} className="mb-2 last:mb-0">
                          {/* Programme separator line (except for first programme) */}
                          {!isFirstProgramme && (
                            <div 
                              className="my-2 border-t border-slate-300"
                              style={{ height: '1px' }}
                            />
                          )}
                          
                          {programmeEntries.map((entry) => {
                            const colourClasses = getEntryColourClasses(entry);
                            const isShared = entry.class_type === 'shared';
                            const programmeName = entry.program?.name || entry.programme_assignments?.[0]?.programme?.name || 'PROGRAMME';
                            
                            return (
                              <div 
                                key={entry.id} 
                                className="mb-1 last:mb-0"
                                style={{
                                  borderLeft: `2px solid ${colourClasses.border}`,
                                  paddingLeft: '4px',
                                }}
                              >
                                {/* Programme label */}
                                <p 
                                  className="text-[8px] font-semibold uppercase tracking-wide mb-0.5"
                                  style={{ color: colourClasses.text }}
                                >
                                  {programmeName}
                                </p>
                                
                                {/* Shared class indicator */}
                                {isShared && (
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <Link className="h-2 w-2" style={{ color: colourClasses.text }} />
                                    <span className="text-[7px] italic" style={{ color: colourClasses.text }}>
                                      COMMON/SHARED
                                    </span>
                                  </div>
                                )}
                                
                                <p className="font-bold leading-tight text-[9px]">{entry.course?.code}</p>
                                <p className="leading-tight text-[8px]">{entry.course?.name}</p>
                                <p className="leading-tight text-[8px]">{entry.lecturer?.full_name || 'To Be Confirmed'}</p>
                                <p className="leading-tight text-[8px]">{venueLabel(entry)}</p>
                                <p className="leading-tight text-[8px]">{formatTimeRange(entry.start_time, entry.end_time)}</p>
                                
                                {/* Shared class programme indicators */}
                                {isShared && entry.programme_assignments && entry.programme_assignments.length > 1 && (
                                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                                    {entry.programme_assignments.slice(0, 3).map((pa) => {
                                      const progColour = getProgrammeColourClasses(pa.programme_id, pa.programme?.name);
                                      return (
                                        <span
                                          key={pa.programme_id}
                                          className="text-[7px] px-1 py-0.5 rounded"
                                          style={{
                                            backgroundColor: progColour.background,
                                            color: progColour.text,
                                            border: `1px solid ${progColour.border}`,
                                          }}
                                        >
                                          {pa.programme?.code || 'PROG'}
                                        </span>
                                      );
                                    })}
                                    {entry.programme_assignments.length > 3 && (
                                      <span className="text-[7px] text-slate-500">
                                        +{entry.programme_assignments.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
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
