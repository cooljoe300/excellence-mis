'use client';

import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Printer, RefreshCw, AlertCircle } from 'lucide-react';
import type { NormalizedTimetableEntry } from '@/app/actions/student-timetable-new';
import type { TimeSlot, Timetable, Program, Intake } from '@/lib/types';
import { getDisplayTimeSlots } from '@/lib/timetable-utils';
import { TimetableWeekTable } from './timetable-day-track';
import {
  CollegeOfficialLetterhead,
  SCHOOL_NAME,
} from '@/components/documents/document-letterhead';
import { printTimetableDocument } from '@/lib/print-timetable';
import { formatDate } from '@/lib/utils';

interface StudentTimetableCleanProps {
  data: {
    student: {
      first_name: string;
      last_name: string;
      student_number?: string;
      admission_number?: string;
    };
    programme: {
      id: string;
      name: string;
    } | null;
    intake: {
      id: string;
      name: string;
    } | null;
    timetables: NormalizedTimetableEntry[];
    timeSlots: TimeSlot[];
  } | { error: string };
}

function StudentTimetablePrintDocument({
  timetables,
  student,
  programme,
  intake,
  timeSlots,
  documentId,
}: {
  timetables: Timetable[];
  student: {
    first_name: string;
    last_name: string;
    student_number?: string;
    admission_number?: string;
  };
  programme: { id: string; name: string } | null;
  intake: { id: string; name: string } | null;
  timeSlots: TimeSlot[];
  documentId?: string;
}) {
  const displaySlots = useMemo(() => getDisplayTimeSlots(timeSlots), [timeSlots]);
  const generatedLabel = formatDate(new Date().toISOString().split('T')[0]);

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
                <p className="font-medium">{student.first_name} {student.last_name}</p>
              </td>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Student Number</p>
                <p className="font-medium">{student.student_number || student.admission_number || 'N/A'}</p>
              </td>
              <td className="w-1/4 border border-slate-400 px-1.5 py-1 align-top">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Programme</p>
                <p className="font-medium">{programme?.name || 'Not assigned'}</p>
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
        tableClassName="print-timetable-table mt-2 w-full table-fixed border-collapse text-[9px]"
      />

      <p className="mt-2 text-center text-[8px] text-slate-500">
        {SCHOOL_NAME} · Student Timetable · {generatedLabel}
      </p>
    </div>
  );
}

export function StudentTimetableClean({ data }: StudentTimetableCleanProps) {
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  // Error state
  if ('error' in data) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Unable to Load Timetable
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {data.error}
            </p>
            <Button onClick={handleRefresh} variant="secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, programme, intake, timetables, timeSlots } = data;

  const handlePrint = () => {
    if (timetables.length === 0) {
      alert('No timetable entries available to print.');
      return;
    }
    printTimetableDocument(`Student Timetable - ${student.first_name} ${student.last_name}`);
  };

  const handlePreview = () => {
    if (timetables.length === 0) {
      alert('No timetable entries available to preview.');
      return;
    }
    setShowPreview(true);
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-600">
            Loading timetable...
          </CardContent>
        </Card>
      </div>
    );
  }

  const displaySlots = useMemo(() => getDisplayTimeSlots(timeSlots), [timeSlots]);

  // Convert normalized timetables to Timetable format for TimetableWeekTable
  const convertedTimetables = useMemo(() => {
    return timetables.map(tt => ({
      id: tt.id,
      academic_year: '',
      semester: '',
      program_id: tt.programme?.id || null,
      department: null,
      campus: '',
      intake_id: tt.intake?.id || null,
      class_section: null,
      course_id: tt.unit.id,
      lecturer_id: tt.lecturer?.id || null,
      room_id: tt.room?.id || null,
      day: tt.day,
      start_time: tt.startTime,
      end_time: tt.endTime,
      duration: null,
      max_students: null,
      teaching_mode: 'physical' as const,
      meeting_link: null,
      status: tt.status as 'active' | 'draft' | 'archived',
      notes: null,
      class_type: tt.classType as 'regular' | 'shared',
      shared_class_id: null,
      created_by: null,
      updated_by: null,
      published_by: null,
      published_at: null,
      created_at: '',
      updated_at: '',
      course: {
        id: tt.unit.id,
        program_id: tt.programme?.id || null,
        name: tt.unit.name,
        code: tt.unit.code,
        description: null,
        credits: 0,
        unit_fee: 0,
        instructor_id: null,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      program: tt.programme ? {
        id: tt.programme.id,
        name: tt.programme.name,
        code: '',
        admission_prefix: null,
        description: null,
        duration_months: 0,
        tuition_fee: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      } : undefined,
      intake: tt.intake ? {
        id: tt.intake.id,
        name: tt.intake.name,
        code: '',
        start_date: '',
        end_date: '',
        is_current: false,
        is_active: true,
        academic_year: null,
        term_id: null,
        created_at: '',
      } : undefined,
      lecturer: tt.lecturer ? {
        id: tt.lecturer.id,
        email: '',
        full_name: tt.lecturer.name,
        role: 'teacher' as const,
        phone: null,
        avatar_url: null,
        can_teach: true,
        staff_number: null,
        department: null,
        specialization: null,
        employment_status: null,
        created_at: '',
        updated_at: '',
      } : null,
      room: tt.room ? {
        id: tt.room.id,
        name: tt.room.name,
        building: null,
        capacity: null,
        type: 'lecture_hall' as const,
        status: 'active',
        created_at: '',
        updated_at: '',
      } : undefined,
    }));
  }, [timetables]);

  // Empty state
  if (timetables.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {student.first_name} {student.last_name}
                </h2>
                <p className="text-sm text-slate-600">
                  {student.student_number || student.admission_number || 'N/A'} · {programme?.name || 'Not assigned'}
                  {intake && ` · ${intake.name}`}
                </p>
              </div>
              <Button onClick={handleRefresh} variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-600">
            {student.student_number || student.admission_number
              ? 'No timetable entries have been published for your registered units yet.'
              : 'No timetable entries have been published for your programme and intake yet.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {student.first_name} {student.last_name}
              </h2>
              <p className="text-sm text-slate-600">
                {student.student_number || student.admission_number || 'N/A'} · {programme?.name || 'Not assigned'}
                {intake && ` · ${intake.name}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRefresh} variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handlePreview} variant="secondary" size="sm">
                Preview Timetable
              </Button>
              <Button onClick={handlePrint} variant="secondary" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TimetableWeekTable
              slots={displaySlots}
              entries={convertedTimetables}
              variant="student"
            />
          </div>
        </CardContent>
      </Card>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} size="full">
        <div className="space-y-4">
          <div className="no-print flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Preview Timetable</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print Timetable
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
            <StudentTimetablePrintDocument
              timetables={convertedTimetables}
              student={student}
              programme={programme}
              intake={intake}
              timeSlots={timeSlots}
            />
          </div>
        </div>
      </Modal>

      {mounted &&
        createPortal(
          <div
            id="student-timetable-print-root"
            className="timetable-print-container"
          >
            <StudentTimetablePrintDocument
              timetables={convertedTimetables}
              student={student}
              programme={programme}
              intake={intake}
              timeSlots={timeSlots}
              documentId="student-timetable-document"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
