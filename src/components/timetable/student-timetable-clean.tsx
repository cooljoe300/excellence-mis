'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw, AlertCircle } from 'lucide-react';
import type { NormalizedTimetableEntry } from '@/app/actions/student-timetable-new';
import type { TimeSlot, Timetable } from '@/lib/types';
import { getDisplayTimeSlots } from '@/lib/timetable-utils';
import { TimetableWeekTable } from './timetable-day-track';

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

export function StudentTimetableClean({ data }: StudentTimetableCleanProps) {
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handlePrint = () => {
    window.print();
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
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Timetable Available
            </h3>
            <p className="text-sm text-slate-600">
              There are currently no timetable entries for your registered units.
              Please contact administration if you believe this is an error.
            </p>
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
    </div>
  );
}
