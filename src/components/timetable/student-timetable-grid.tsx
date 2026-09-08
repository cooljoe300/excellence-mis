'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { Timetable, TimeSlot, Program, Intake } from '@/lib/types';
import { getDisplayTimeSlots } from '@/lib/timetable-utils';
import { printTimetableDocument } from '@/lib/print-timetable';
import { CollegeOfficialLetterhead, SCHOOL_NAME } from '@/components/documents/document-letterhead';
import { TimetableWeekTable } from './timetable-day-track';

interface StudentTimetableGridProps {
  timetables: Timetable[];
  timeSlots: TimeSlot[];
  studentName: string;
  studentNumber: string;
  programmeName: string;
  programme?: Partial<Program>;
  intake?: Partial<Intake>;
  onPreview?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

function StudentTimetableDocument({
  timetables,
  timeSlots,
  studentName,
  studentNumber,
  programmeName,
  intake,
  documentId,
}: {
  timetables: Timetable[];
  timeSlots: TimeSlot[];
  studentName: string;
  studentNumber: string;
  programmeName: string;
  programme?: Partial<Program>;
  intake?: Partial<Intake>;
  documentId?: string;
}) {
  const displaySlots = useMemo(() => getDisplayTimeSlots(timeSlots), [timeSlots]);

  return (
    <div
      id={documentId}
      className="print-document print-timetable-document bg-white text-slate-900"
    >
      <div className="print-timetable-heading">
        <CollegeOfficialLetterhead documentTitle="Student Timetable" compact />

        <table className="mt-2 w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Student</p>
                <p className="font-medium">{studentName}</p>
              </td>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Student Number</p>
                <p className="font-medium">{studentNumber}</p>
              </td>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Programme</p>
                <p className="font-medium">{programmeName}</p>
              </td>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Intake</p>
                <p className="font-medium">{intake?.name || '—'}</p>
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
        tableClassName="print-timetable-table mt-3 w-full table-fixed border-collapse text-[10px]"
      />

      <p className="mt-2 text-center text-[8px] text-slate-500">
        {SCHOOL_NAME} · Student Timetable · {studentName}
      </p>
    </div>
  );
}

export function StudentTimetableGrid({
  timetables,
  timeSlots,
  studentName,
  studentNumber,
  programmeName,
  programme,
  intake,
  onDownload,
}: StudentTimetableGridProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const displaySlots = useMemo(() => getDisplayTimeSlots(timeSlots), [timeSlots]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    if (!printRef.current) return;
    printTimetableDocument(`Student Timetable - ${studentName} (${studentNumber})`);
  };

  const documentProps = {
    timetables,
    timeSlots,
    studentName,
    studentNumber,
    programmeName,
    programme,
    intake,
  };

  return (
    <div className="space-y-4">
      {mounted &&
        createPortal(
          <div
            ref={printRef}
            id="student-timetable-print-root"
            className="timetable-print-container"
          >
            <StudentTimetableDocument {...documentProps} documentId="student-timetable-document" />
          </div>,
          document.body
        )}

      <Card className="no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {studentName}
              </h2>
              <p className="text-sm text-slate-600">
                {studentNumber} • {programmeName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowPreviewModal(true)}>
                Preview Timetable
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Timetable
              </Button>
              {onDownload && (
                <Button variant="secondary" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TimetableWeekTable
              slots={displaySlots}
              entries={timetables}
              variant="student"
            />
          </div>
        </CardContent>
      </Card>

      {timetables.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-600">
            No timetable entries found. Enroll in units to see your schedule.
          </CardContent>
        </Card>
      )}

      <Modal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Preview Timetable"
        size="lg"
      >
        <StudentTimetableDocument {...documentProps} />
      </Modal>
    </div>
  );
}
