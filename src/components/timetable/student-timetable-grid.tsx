'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download, Link } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { Timetable, TimeSlot } from '@/lib/types';
import {
  TIMETABLE_DAYS,
  TIMETABLE_DAY_LABELS,
  cardHeightForDuration,
  entriesForSlot,
  formatTimeRange,
  getDisplayTimeSlots,
  isPrimarySlotForEntry,
} from '@/lib/timetable-utils';
import { getProgrammeColourClasses, getSharedClassColourClasses } from '@/lib/programme-colours';
import { TimetablePrintDocument } from './timetable-preview';
import { CollegeOfficialLetterhead, SCHOOL_NAME } from '@/components/documents/document-letterhead';

interface StudentTimetableGridProps {
  timetables: Timetable[];
  timeSlots: TimeSlot[];
  studentName: string;
  studentNumber: string;
  programmeName: string;
  programme?: { code: string; name: string };
  intake?: { code: string; name: string };
  onPreview?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
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

export function StudentTimetableGrid({
  timetables,
  timeSlots,
  studentName,
  studentNumber,
  programmeName,
  programme,
  intake,
  onPreview,
  onPrint,
  onDownload,
}: StudentTimetableGridProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const displaySlots = useMemo(() => getDisplayTimeSlots(timeSlots), [timeSlots]);

  const handlePrint = () => {
    window.print();
  };

  const handlePreview = () => {
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Student Info Header */}
      <Card>
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
              <Button variant="secondary" size="sm" onClick={handlePreview}>
                Preview Timetable
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
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

      {/* Timetable Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 w-[80px] min-w-[80px] max-w-[90px] border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold text-slate-700">
                    Day
                  </th>
                  {displaySlots.map((slot) => (
                    <th
                      key={slot.id}
                      className="border-r border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-700"
                    >
                      {slot.label}
                    </th>
                  ))}
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
                    {displaySlots.map((slot) => {
                      const entries = entriesForSlot(timetables, day, slot);
                      const slotValue = `${slot.start}-${slot.end}`;
                      return (
                        <td
                          key={`${day}-${slot.id}`}
                          className="h-24 min-w-[150px] border-r border-slate-200 px-1 py-1 align-top"
                        >
                          {entries.length > 0 ? (
                            <div className="space-y-2">
                              {entries.map((entry) => {
                                const primary = isPrimarySlotForEntry(entry, slot);
                                const colourClasses = getEntryColourClasses(entry);
                                const isShared = entry.class_type === 'shared';
                                
                                return (
                                  <article
                                    key={entry.id}
                                    className="relative rounded border border-slate-200 border-l-4 p-1.5 text-left"
                                    style={{
                                      borderLeftColor: colourClasses.border,
                                      backgroundColor: colourClasses.background,
                                      minHeight: primary ? cardHeightForDuration(entry.start_time, entry.end_time) : undefined,
                                    }}
                                  >
                                    {/* Programme indicator */}
                                    <div className="flex items-center gap-1 mb-1">
                                      {isShared ? (
                                        <div className="flex items-center gap-1">
                                          <Link className="h-3 w-3" style={{ color: colourClasses.text }} />
                                          <span className="text-[9px] font-semibold" style={{ color: colourClasses.text }}>
                                            SHARED CLASS
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[9px] font-semibold" style={{ color: colourClasses.text }}>
                                          {entry.program?.code || entry.programme_assignments?.[0]?.programme?.code || 'UNIT'}
                                        </span>
                                      )}
                                    </div>

                                    <p className="pr-5 text-[11px] font-bold leading-tight text-slate-900">
                                      {entry.course?.code || 'Unit'}
                                    </p>
                                    {primary && (
                                      <>
                                        <p className="mt-0.5 text-[10px] leading-snug text-slate-700">
                                          {entry.course?.name}
                                        </p>
                                        <p className="mt-1 text-[10px] text-slate-600">
                                          Lecturer: {entry.lecturer?.full_name || 'To Be Confirmed'}
                                        </p>
                                        <p className="text-[10px] text-slate-600">
                                          Room: {entry.room?.name || 'Online'}
                                        </p>
                                        <p className="mt-1 text-[10px] font-medium text-slate-800">
                                          {formatTimeRange(entry.start_time, entry.end_time)}
                                        </p>
                                        
                                        {/* Shared class programme indicators */}
                                        {isShared && entry.programme_assignments && entry.programme_assignments.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {entry.programme_assignments.slice(0, 3).map((assignment) => {
                                              const progColour = getProgrammeColourClasses(assignment.programme_id, assignment.programme?.name);
                                              return (
                                                <span
                                                  key={assignment.programme_id}
                                                  className="text-[8px] px-1.5 py-0.5 rounded-full"
                                                  style={{
                                                    backgroundColor: progColour.background,
                                                    color: progColour.text,
                                                    border: `1px solid ${progColour.border}`,
                                                  }}
                                                >
                                                  {assignment.programme?.code || 'PROG'}
                                                </span>
                                              );
                                            })}
                                            {entry.programme_assignments.length > 3 && (
                                              <span className="text-[8px] text-slate-500">
                                                +{entry.programme_assignments.length - 3}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {!primary && (
                                      <p className="text-[9px] text-slate-500">continues</p>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex h-full min-h-[72px] items-center justify-center text-slate-300">
                              <span className="text-xs text-slate-400">No class</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
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

      {/* Preview Modal */}
      <Modal
        open={showPreviewModal}
        onClose={handleClosePreview}
        title="Preview Timetable"
        size="lg"
      >
        <div className="print-timetable">
          <CollegeOfficialLetterhead />
          <div className="mb-4 text-center">
            <h1 className="text-xl font-bold text-slate-900 mb-1">
              {SCHOOL_NAME}
            </h1>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">
              Student Timetable
            </h2>
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-semibold">Student:</span> {studentName}</p>
              <p><span className="font-semibold">Student Number:</span> {studentNumber}</p>
              <p><span className="font-semibold">Programme:</span> {programmeName}</p>
              {programme && <p><span className="font-semibold">Programme Code:</span> {programme.code}</p>}
              {intake && <p><span className="font-semibold">Intake:</span> {intake.name}</p>}
            </div>
          </div>
          <TimetablePrintDocument
            timetables={timetables}
            program={programme}
            intake={intake}
            timeSlots={timeSlots}
            documentId="student-timetable"
          />
        </div>
      </Modal>
    </div>
  );
}
