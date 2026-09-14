'use server';

import { createClient } from '@/lib/supabase/server';
import type { Timetable, Profile, Program, Intake, Course, Room, TimeSlot } from '@/lib/types';
import { normalizeDay, formatClockTime } from '@/lib/timetable-utils';

/**
 * Clean student timetable implementation - rebuilt from scratch
 * 
 * Architecture:
 * 1. Get authenticated student from profile_id
 * 2. Get student's programme and intake
 * 3. Get student's enrolled courses
 * 4. Fetch timetable records matching student's programme/intake/courses
 * 5. Fetch lecturer profiles separately using lecturer_ids
 * 6. Build normalized timetable objects
 * 7. Return to UI
 */

interface StudentTimetableData {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_number?: string;
    admission_number?: string;
    email: string;
  };
  programme: {
    id: string;
    name: string;
  } | null;
  intake: {
    id: string;
    name: string;
  } | null;
  enrolledCourses: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  timetables: NormalizedTimetableEntry[];
  timeSlots: TimeSlot[];
}

export interface NormalizedTimetableEntry {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  unit: {
    id: string;
    code: string;
    name: string;
  };
  programme: {
    id: string;
    name: string;
  } | null;
  intake: {
    id: string;
    name: string;
  } | null;
  lecturer: {
    id: string;
    name: string;
  } | null;
  room: {
    id: string;
    name: string;
  } | null;
  status: string;
  classType: string;
}

/**
 * Get the authenticated student's timetable with clean data pipeline
 */
export async function getStudentTimetableClean(): Promise<StudentTimetableData | { error: string }> {
  const supabase = await createClient();
  
  try {
    // Step 1: Get authenticated user
    const { data: { user }, error: authError } = await (supabase.auth as any).getUser();
    
    if (authError) {
      console.error('[STUDENT TIMETABLE CLEAN] Auth error:', authError);
      return { error: 'Authentication failed. Please sign in again.' };
    }
    
    if (!user) {
      return { error: 'You must be signed in to view your timetable.' };
    }
    
    console.log('[STUDENT TIMETABLE CLEAN] Authenticated user:', user.id);
    
    // Step 2: Get student record with programme and intake
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, first_name, last_name, student_number, admission_number, email, program_id, intake_id, program:programs(id, name, code), intake:intakes(id, name)')
      .eq('profile_id', user.id)
      .maybeSingle();
    
    if (studentError) {
      console.error('[STUDENT TIMETABLE CLEAN] Student lookup error:', studentError);
      return { error: 'Failed to retrieve student record.' };
    }
    
    if (!student) {
      console.log('[STUDENT TIMETABLE CLEAN] No student found for user:', user.id);
      return { error: 'Student record not found. Please complete your registration.' };
    }
    
    console.log('[STUDENT TIMETABLE CLEAN] Student found:', {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      programme_id: student.program_id,
      intake_id: student.intake_id,
    });
    
    // Step 3: Get student's enrolled courses
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('course_id, course:courses(id, code, name)')
      .eq('student_id', student.id)
      .eq('status', 'active');
    
    if (enrollmentError) {
      console.error('[STUDENT TIMETABLE CLEAN] Enrollment lookup error:', enrollmentError);
      // Continue without enrollment filter - will show all programme timetables
    }
    
    const enrolledCourses = (enrollments || [])
      .map((e: any) => e.course)
      .filter(Boolean);
    
    const enrolledCourseIds = enrolledCourses.map((c: any) => c.id);
    
    console.log('[STUDENT TIMETABLE CLEAN] Enrolled courses:', enrolledCourseIds.length);
    
    // Step 4: Fetch timetable records
    let timetableRows: any[] = [];
    
    if (student.program_id) {
      // Primary approach: Fetch by programme and intake
      console.log('[STUDENT TIMETABLE CLEAN] Fetching by programme:', student.program_id);
      
      // Get shared session assignments for this programme
      const { data: assignments, error: assignmentError } = await supabase
        .from('timetable_programme_assignments')
        .select('timetable_id')
        .eq('programme_id', student.program_id);
      
      if (assignmentError) {
        console.error('[STUDENT TIMETABLE CLEAN] Assignment lookup error:', assignmentError);
      }
      
      const assignedTimetableIds = (assignments || []).map((a: any) => a.timetable_id);
      console.log('[STUDENT TIMETABLE CLEAN] Assigned timetable IDs:', assignedTimetableIds.length);
      
      // Fetch regular timetables for this programme
      const { data: regularTimetables, error: regularError } = await supabase
        .from('timetables')
        .select('*')
        .eq('program_id', student.program_id)
        .eq('status', 'active');
      
      if (regularError) {
        console.error('[STUDENT TIMETABLE CLEAN] Regular timetable error:', regularError);
      } else {
        console.log('[STUDENT TIMETABLE CLEAN] Regular timetables:', regularTimetables?.length || 0);
        timetableRows.push(...(regularTimetables || []));
      }
      
      // Fetch shared timetables
      if (assignedTimetableIds.length > 0) {
        const { data: sharedTimetables, error: sharedError } = await supabase
          .from('timetables')
          .select('*')
          .in('id', assignedTimetableIds)
          .eq('status', 'active');
        
        if (sharedError) {
          console.error('[STUDENT TIMETABLE CLEAN] Shared timetable error:', sharedError);
        } else {
          console.log('[STUDENT TIMETABLE CLEAN] Shared timetables:', sharedTimetables?.length || 0);
          timetableRows.push(...(sharedTimetables || []));
        }
      }
      
      // Deduplicate by ID
      const uniqueMap = new Map(timetableRows.map((tt) => [tt.id, tt]));
      timetableRows = Array.from(uniqueMap.values());
      
      console.log('[STUDENT TIMETABLE CLEAN] Total timetables before filtering:', timetableRows.length);
      
      // Filter by intake if student has one
      if (student.intake_id) {
        timetableRows = timetableRows.filter((tt: any) => {
          return !tt.intake_id || tt.intake_id === student.intake_id;
        });
        console.log('[STUDENT TIMETABLE CLEAN] After intake filter:', timetableRows.length);
      }
      
      // Filter by enrolled courses if student has enrollments
      if (enrolledCourseIds.length > 0) {
        timetableRows = timetableRows.filter((tt: any) => {
          return enrolledCourseIds.includes(tt.course_id);
        });
        console.log('[STUDENT TIMETABLE CLEAN] After course filter:', timetableRows.length);
      }
    } else if (enrolledCourseIds.length > 0) {
      // Fallback: Fetch by enrolled courses only
      console.log('[STUDENT TIMETABLE CLEAN] No programme, fetching by courses');
      
      const { data: courseTimetables, error: courseError } = await supabase
        .from('timetables')
        .select('*')
        .in('course_id', enrolledCourseIds)
        .eq('status', 'active');
      
      if (courseError) {
        console.error('[STUDENT TIMETABLE CLEAN] Course timetable error:', courseError);
      } else {
        console.log('[STUDENT TIMETABLE CLEAN] Course timetables:', courseTimetables?.length || 0);
        timetableRows = courseTimetables || [];
      }
    }
    
    console.log('[STUDENT TIMETABLE CLEAN] Final timetable rows:', timetableRows.length);
    
    // Step 5: Fetch lecturer profiles separately
    const lecturerIds = Array.from(
      new Set(
        timetableRows
          .map((tt: any) => tt.lecturer_id)
          .filter(Boolean)
      )
    );
    
    console.log('[STUDENT TIMETABLE CLEAN] Unique lecturer IDs:', lecturerIds.length);
    
    let lecturerMap = new Map<string, Profile>();
    if (lecturerIds.length > 0) {
      const { data: lecturers, error: lecturerError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', lecturerIds);
      
      if (lecturerError) {
        console.error('[STUDENT TIMETABLE CLEAN] Lecturer lookup error:', lecturerError);
        // Continue without lecturer data - will show "Lecturer to be confirmed"
      } else {
        lecturerMap = new Map(
          (lecturers || []).map((l: any) => [l.id, l])
        );
        console.log('[STUDENT TIMETABLE CLEAN] Lecturers fetched:', lecturerMap.size);
      }
    }
    
    // Step 6: Fetch related data (courses, programmes, intakes, rooms)
    const courseIds = Array.from(
      new Set(
        timetableRows
          .map((tt: any) => tt.course_id)
          .filter(Boolean)
      )
    );
    
    const programIds = Array.from(
      new Set(
        timetableRows
          .map((tt: any) => tt.program_id)
          .filter(Boolean)
      )
    );
    
    const intakeIds = Array.from(
      new Set(
        timetableRows
          .map((tt: any) => tt.intake_id)
          .filter(Boolean)
      )
    );
    
    const roomIds = Array.from(
      new Set(
        timetableRows
          .map((tt: any) => tt.room_id)
          .filter(Boolean)
      )
    );
    
    const [courses, programs, intakes, rooms] = await Promise.all([
      courseIds.length > 0 
        ? supabase.from('courses').select('id, code, name').in('id', courseIds)
        : Promise.resolve({ data: [], error: null }),
      programIds.length > 0
        ? supabase.from('programs').select('id, name').in('id', programIds)
        : Promise.resolve({ data: [], error: null }),
      intakeIds.length > 0
        ? supabase.from('intakes').select('id, name').in('id', intakeIds)
        : Promise.resolve({ data: [], error: null }),
      roomIds.length > 0
        ? supabase.from('rooms').select('id, name').in('id', roomIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    
    const courseMap = new Map((courses.data || []).map((c: any) => [c.id, c]));
    const programMap = new Map((programs.data || []).map((p: any) => [p.id, p]));
    const intakeMap = new Map((intakes.data || []).map((i: any) => [i.id, i]));
    const roomMap = new Map((rooms.data || []).map((r: any) => [r.id, r]));
    
    // Step 7: Build normalized timetable entries
    const normalizedTimetables: NormalizedTimetableEntry[] = timetableRows.map((tt: any) => {
      const lecturer = lecturerMap.get(tt.lecturer_id);
      const course = courseMap.get(tt.course_id);
      const program = programMap.get(tt.program_id);
      const intake = intakeMap.get(tt.intake_id);
      const room = roomMap.get(tt.room_id);
      
      return {
        id: tt.id,
        day: normalizeDay(tt.day),
        startTime: formatClockTime(tt.start_time),
        endTime: formatClockTime(tt.end_time),
        unit: {
          id: tt.course_id,
          code: course?.code || 'N/A',
          name: course?.name || 'Unknown Unit',
        },
        programme: program ? {
          id: program.id,
          name: program.name,
        } : null,
        intake: intake ? {
          id: intake.id,
          name: intake.name,
        } : null,
        lecturer: lecturer ? {
          id: lecturer.id,
          name: lecturer.full_name || 'Unknown',
        } : null,
        room: room ? {
          id: room.id,
          name: room.name,
        } : null,
        status: tt.status,
        classType: tt.class_type || 'regular',
      };
    });
    
    console.log('[STUDENT TIMETABLE CLEAN] Normalized timetables:', normalizedTimetables.length);
    
    // Step 8: Fetch time slots
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('*')
      .order('start_time', { ascending: true });
    
    if (timeSlotsError) {
      console.error('[STUDENT TIMETABLE CLEAN] Time slots error:', timeSlotsError);
    }
    
    const formattedTimeSlots = (timeSlots || []).map((slot: any) => ({
      ...slot,
      start_time: formatClockTime(slot.start_time),
      end_time: formatClockTime(slot.end_time),
    }));
    
    // Step 9: Return complete data
    return {
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        student_number: student.student_number,
        admission_number: student.admission_number,
        email: student.email,
      },
      programme: Array.isArray(student.program) && student.program[0] ? {
        id: student.program[0].id,
        name: student.program[0].name,
      } : (student.program as any) ? {
        id: (student.program as any).id,
        name: (student.program as any).name,
      } : null,
      intake: Array.isArray(student.intake) && student.intake[0] ? {
        id: student.intake[0].id,
        name: student.intake[0].name,
      } : (student.intake as any) ? {
        id: (student.intake as any).id,
        name: (student.intake as any).name,
      } : null,
      enrolledCourses,
      timetables: normalizedTimetables,
      timeSlots: formattedTimeSlots,
    };
    
  } catch (error) {
    console.error('[STUDENT TIMETABLE CLEAN] Unexpected error:', error);
    return { error: 'An unexpected error occurred while loading your timetable.' };
  }
}
