'use client';

import { useMemo } from 'react';
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
}

export function TimetablePrintDocument({
  timetables,
  program,
  intake,
  academicYear,
  timeSlots,
  generatedDate = new Date().toISOString(),
}: {
  timetables: Timetable[];
  program?: Program;
  intake?: Intake;
  academicYear?: string;
  timeSlots: TimeSlot[];
  generatedDate?: string;
}) {
  const displaySlots = useMemo(() => getDisplayTimeSlots(timeSlots), [timeSlots]);
  const statusLabel = timetables.some((entry) => entry.status === 'draft')
    ? 'Includes draft entries'
    : 'Active';

  return (
    <div id="official-class-timetable" className="print-document print-timetable bg-white p-6 text-slate-900">
      <CollegeOfficialLetterhead documentTitle="OFFICIAL CLASS TIMETABLE" />

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 border-b border-slate-300 pb-3 text-[11px] sm:grid-cols-4">
        <div>
          <dt className="font-semibold text-slate-500">Programme</dt>
          <dd>{program ? `${program.code} — ${program.name}` : 'All programmes'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Intake</dt>
          <dd>{intake?.name || 'All intakes'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Academic period</dt>
          <dd>{academicYear || intake?.academic_year || '—'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Generated</dt>
          <dd>{formatDate(generatedDate.split('T')[0])} · {statusLabel}</dd>
        </div>
      </dl>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="w-[70px] border border-slate-400 bg-slate-100 px-1 py-1 text-left font-semibold">
                Day
              </th>
              {displaySlots.map((slot) => (
                <th key={slot.id} className="border border-slate-400 bg-slate-100 px-1 py-1 text-center font-semibold">
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIMETABLE_DAYS.map((day) => (
              <tr key={day}>
                <td className="border border-slate-400 px-1 py-1 font-semibold" title={day}>
                  {TIMETABLE_DAY_LABELS[day]}
                </td>
                {displaySlots.map((slot) => {
                  const entries = entriesForSlot(timetables, day, slot).filter((entry) =>
                    isPrimarySlotForEntry(entry, slot)
                  );
                  return (
                    <td key={`${day}-${slot.id}`} className="h-16 align-top border border-slate-400 px-1 py-1">
                      {entries.map((entry) => (
                        <div key={entry.id} className="mb-1 last:mb-0">
                          <p className="font-bold">{entry.course?.code}</p>
                          <p>{entry.course?.name}</p>
                          <p>Lecturer: {entry.lecturer?.full_name || '—'}</p>
                          <p>Room: {entry.room?.name || 'Online'}</p>
                          <p>{formatTimeRange(entry.start_time, entry.end_time)}</p>
                          <p className="uppercase">{entry.status}</p>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-6 border-t border-slate-300 pt-2 text-center text-[9px] text-slate-500">
        <p>
          {SCHOOL_NAME} · Official Class Timetable · Generated {formatDate(generatedDate.split('T')[0])}
        </p>
      </footer>
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
}: TimetablePreviewProps) {
  function handlePrint() {
    const originalTitle = document.title;
    document.title = `Official Class Timetable${program ? ` - ${program.code}` : ''}${intake ? ` - ${intake.name}` : ''}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  }

  return (
    <Modal open={isOpen} onClose={onClose} size="full" className="print:max-w-none print:shadow-none">
      <div className="space-y-4">
        <div className="no-print flex items-center justify-between gap-3">
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
        <TimetablePrintDocument
          timetables={timetables}
          program={program}
          intake={intake}
          academicYear={academicYear}
          timeSlots={timeSlots}
        />
      </div>
    </Modal>
  );
}
