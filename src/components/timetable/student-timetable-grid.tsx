'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { Timetable, TimeSlot, Program, Intake } from '@/lib/types';
import {
  TIMETABLE_DAYS,
  TIMETABLE_DAY_LABELS,
  getDisplayTimeSlots,
} from '@/lib/timetable-utils';
import { printTimetableDocument } from '@/lib/print-timetable';
import { CollegeOfficialLetterhead, SCHOOL_NAME } from '@/components/documents/document-letterhead';
import { TimetableDayTrack, TimetableSlotHeaders } from './timetable-day-track';

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

      <table className="print-timetable-table mt-3 w-full table-fixed border-collapse text-[10px]">
        <thead>
          <tr className="border-b-2 border-slate-800 bg-slate-50">
            <th className="w-[60px] border-r border-slate-800 bg-slate-50 px-1 py-1 text-left text-[9px] font-semibold text-slate-900">
              Day
            </th>
            <TimetableSlotHeaders slots={displaySlots} compact />
          </tr>
        </thead>
        <tbody>
          {TIMETABLE_DAYS.map((day) => (
            <tr key={day} className="border-b border-slate-200">
              <td
                className="print-timetable-cell w-[60px] border border-slate-200 px-1 py-1 text-[9px] font-semibold text-slate-900"
                title={day}
              >
                {TIMETABLE_DAY_LABELS[day]}
              </td>
              <td colSpan={displaySlots.length} className="print-timetable-cell box-border border border-slate-200 p-0 align-top">
                <TimetableDayTrack
                  day={day}
                  slots={displaySlots}
                  entries={timetables}
                  variant="print"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
            <table className="w-full min-w-[760px] table-fixed border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 w-[80px] min-w-[80px] max-w-[90px] border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold text-slate-700">
                    Day
                  </th>
                  <TimetableSlotHeaders slots={displaySlots} />
                </tr>
              </thead>
              <tbody>
                {TIMETABLE_DAYS.map((day) => (
                  <tr key={day} className="border-b border-slate-100">
                    <td
                      className="sticky left-0 z-10 w-[80px] min-w-[80px] max-w-[90px] border-r border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900"
                      title={day}
                    >
                      {TIMETABLE_DAY_LABELS[day]}
                    </td>
                    <td colSpan={displaySlots.length} className="box-border p-0 align-top">
                      <TimetableDayTrack
                        day={day}
                        slots={displaySlots}
                        entries={timetables}
                        variant="student"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
