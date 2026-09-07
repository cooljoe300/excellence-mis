'use server';

import { createClient } from '@/lib/supabase/server';
import type { Timetable, Room, TimeSlot, Profile, Program, Course, Intake, AcademicTerm, TimetableProgrammeAssignment } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { resolveAcademicPeriod } from '@/lib/academic-period';
import {
  durationMinutes,
  formatClockTime,
  formatTimeRange,
  normalizeDay,
  timeToMinutes,
  timesOverlap,
  weekdayLong,
} from '@/lib/timetable-utils';

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function mapById<T extends { id: string }>(rows: T[] | null | undefined): Record<string, T> {
  return Object.fromEntries((rows || []).map((row) => [row.id, row]));
}

async function hydrateTimetables(rows: Timetable[] | null | undefined): Promise<Timetable[]> {
  if (!rows || rows.length === 0) return [];

  const supabase = await createClient();
  const programIds = uniqueIds(rows.map((row) => row.program_id));
  const courseIds = uniqueIds(rows.map((row) => row.course_id));
  const lecturerIds = uniqueIds(rows.map((row) => row.lecturer_id));
  const intakeIds = uniqueIds(rows.map((row) => row.intake_id));
  const roomIds = uniqueIds(rows.map((row) => row.room_id));
  const timetableIds = uniqueIds(rows.map((row) => row.id));

  const [programs, courses, lecturers, intakes, rooms, programmeAssignments] = await Promise.all([
    programIds.length
      ? supabase.from('programs').select('*').in('id', programIds)
      : Promise.resolve({ data: [] as Program[] }),
    courseIds.length
      ? supabase.from('courses').select('*').in('id', courseIds)
      : Promise.resolve({ data: [] as Course[] }),
    lecturerIds.length
      ? supabase.from('profiles').select('*').in('id', lecturerIds)
      : Promise.resolve({ data: [] as Profile[] }),
    intakeIds.length
      ? supabase.from('intakes').select('*, term:academic_terms(*)').in('id', intakeIds)
      : Promise.resolve({ data: [] as Intake[], error: null }),
    roomIds.length
      ? supabase.from('rooms').select('*').in('id', roomIds)
      : Promise.resolve({ data: [] as Room[] }),
    timetableIds.length
      ? supabase.from('timetable_programme_assignments').select('*').in('timetable_id', timetableIds)
      : Promise.resolve({ data: [] as TimetableProgrammeAssignment[] }),
  ]);

  let intakeRows = (intakes.data || []) as Intake[];
  if (intakeIds.length && intakes.error) {
    const fallback = await supabase.from('intakes').select('*').in('id', intakeIds);
    intakeRows = (fallback.data || []) as Intake[];
  }

  const programMap = mapById(programs.data as Program[] | null);
  const courseMap = mapById(courses.data as Course[] | null);
  const lecturerMap = mapById(lecturers.data as Profile[] | null);
  const intakeMap = mapById(intakeRows);
  const roomMap = mapById(rooms.data as Room[] | null);

  // Create map of timetable assignments
  const assignmentsMap: Record<string, TimetableProgrammeAssignment[]> = {};
  (programmeAssignments.data || []).forEach((assignment) => {
    if (!assignmentsMap[assignment.timetable_id]) {
      assignmentsMap[assignment.timetable_id] = [];
    }
    assignmentsMap[assignment.timetable_id].push({
      ...assignment,
      programme: assignment.programme_id ? programMap[assignment.programme_id] : undefined,
      intake: assignment.intake_id ? intakeMap[assignment.intake_id] : undefined,
    });
  });

  return rows.map((row) => ({
    ...row,
    day: normalizeDay(row.day),
    start_time: formatClockTime(row.start_time),
    end_time: formatClockTime(row.end_time),
    programme_assignments: assignmentsMap[row.id] || [],
    program: row.program_id ? programMap[row.program_id] : row.program,
    course: row.course_id ? courseMap[row.course_id] : row.course,
    lecturer: row.lecturer_id ? lecturerMap[row.lecturer_id] : row.lecturer,
    intake: row.intake_id ? intakeMap[row.intake_id] : row.intake,
    room: row.room_id ? roomMap[row.room_id] : row.room,
  }));
}

async function fetchTimetableRows(filters?: {
  programId?: string;
  intakeId?: string;
  academicYear?: string;
  status?: string;
}) {
  const supabase = await createClient();
  
  // If filtering by programme, we need to get both direct programme assignments
  // and shared sessions that include this programme
  if (filters?.programId) {
    // Get direct programme assignments and shared sessions
    const { data: assignments, error: assignmentError } = await supabase
      .from('timetable_programme_assignments')
      .select('timetable_id')
      .eq('programme_id', filters.programId);

    if (assignmentError) {
      console.error('Error fetching programme assignments:', assignmentError);
    }

    const assignedTimetableIds = (assignments || []).map((a: any) => a.timetable_id);

    // Get regular timetables for this programme + shared sessions
    const { data: regularTimetables, error: regularError } = await supabase
      .from('timetables')
      .select('*')
      .eq('program_id', filters.programId);

    const { data: sharedTimetables, error: sharedError } = assignedTimetableIds.length > 0
      ? await supabase
          .from('timetables')
          .select('*')
          .in('id', assignedTimetableIds)
      : { data: [], error: null };

    if (regularError) {
      console.error('Error fetching regular timetables:', regularError);
    }
    if (sharedError) {
      console.error('Error fetching shared timetables:', sharedError);
    }

    // Combine and deduplicate
    const allTimetables = [...(regularTimetables || []), ...(sharedTimetables || [])];
    const uniqueTimetables = Array.from(
      new Map(allTimetables.map((tt) => [tt.id, tt])).values()
    );

    // Apply other filters
    let filtered = uniqueTimetables;
    if (filters?.intakeId) {
      filtered = filtered.filter((tt: any) => 
        tt.intake_id === filters.intakeId || 
        tt.programme_assignments?.some((pa: any) => pa.intake_id === filters.intakeId)
      );
    }
    if (filters?.academicYear) {
      filtered = filtered.filter((tt: any) => tt.academic_year === filters.academicYear);
    }
    if (filters?.status) {
      filtered = filtered.filter((tt: any) => tt.status === filters.status);
    }

    return hydrateTimetables(filtered as Timetable[]);
  }

  // No programme filter - use regular query
  let query = supabase.from('timetables').select('*');
  if (filters?.intakeId) query = query.eq('intake_id', filters.intakeId);
  if (filters?.academicYear) query = query.eq('academic_year', filters.academicYear);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query
    .order('day', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching timetables:', error);
    return [] as Timetable[];
  }

  return hydrateTimetables((data || []) as Timetable[]);
}

function revalidateTimetablePaths() {
  revalidatePath('/dashboard/timetable');
  revalidatePath('/dashboard/timetable/list');
  revalidatePath('/dashboard/timetable/weekly');
}

export async function getTimetableStats() {
  const supabase = await createClient();
  const today = weekdayLong();

  try {
    const [totalTimetables, activeTimetables, totalTimeSlots, todayClasses] = await Promise.all([
      supabase.from('timetables').select('*', { count: 'exact', head: true }),
      supabase.from('timetables').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('time_slots').select('*', { count: 'exact', head: true }),
      supabase.from('timetables').select('*', { count: 'exact', head: true }).eq('day', today),
    ]);

    return {
      totalTimetables: totalTimetables.count || 0,
      activeTimetables: activeTimetables.count || 0,
      totalTimeSlots: totalTimeSlots.count || 0,
      todayClasses: todayClasses.count || 0,
    };
  } catch (error) {
    console.error('Error fetching timetable stats:', error);
    return {
      totalTimetables: 0,
      activeTimetables: 0,
      totalTimeSlots: 0,
      todayClasses: 0,
    };
  }
}

export async function getTimetables() {
  return fetchTimetableRows();
}

export async function getTimetablesByFilter(filters: {
  programId?: string;
  intakeId?: string;
  academicYear?: string;
  status?: string;
}) {
  return fetchTimetableRows(filters);
}

export async function getRooms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
  return (data || []) as Room[];
}

export async function getTimeSlots() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching time slots:', error);
    return [];
  }
  return (data || []) as TimeSlot[];
}

export async function toggleTimeSlotVisibility(id: string, isVisible: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('time_slots')
    .update({ is_visible: isVisible })
    .eq('id', id);

  if (error) {
    console.error('Error toggling time slot visibility:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/timetable/time-slots');
  revalidatePath('/dashboard/timetable');
  
  return { success: true };
}

export async function getTimetableFormData() {
  const supabase = await createClient();

  try {
    const [programs, courses, lecturers, timeSlots, intakes, rooms] = await Promise.all([
      supabase.from('programs').select('*').order('name', { ascending: true }),
      supabase.from('courses').select('*').order('name', { ascending: true }),
      supabase.from('profiles').select('*').eq('can_teach', true).order('full_name', { ascending: true }),
      supabase.from('time_slots').select('*').order('start_time', { ascending: true }),
      supabase.from('intakes').select('*, term:academic_terms(*)').order('start_date', { ascending: false }),
      supabase.from('rooms').select('*').order('name', { ascending: true }),
    ]);

    let intakeRows = (intakes.data || []) as Intake[];
    if (intakes.error) {
      console.error('Error fetching intakes with academic terms:', intakes.error);
      const fallback = await supabase.from('intakes').select('*').order('start_date', { ascending: false });
      intakeRows = (fallback.data || []) as Intake[];
    }

    return {
      programs: (programs.data || []) as Program[],
      courses: (courses.data || []) as Course[],
      lecturers: (lecturers.data || []) as Profile[],
      timeSlots: (timeSlots.data || []) as TimeSlot[],
      intakes: intakeRows,
      rooms: (rooms.data || []) as Room[],
    };
  } catch (error) {
    console.error('Error fetching timetable form data:', error);
    return {
      programs: [] as Program[],
      courses: [] as Course[],
      lecturers: [] as Profile[],
      timeSlots: [] as TimeSlot[],
      intakes: [] as Intake[],
      rooms: [] as Room[],
    };
  }
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

async function resolveIntakeAcademicPeriod(intakeId: string): Promise<
  { academicYear: string; semester: string } | { error: string }
> {
  const supabase = await createClient();
  const id = intakeId.trim();

  const withTerm = await supabase
    .from('intakes')
    .select('*, term:academic_terms(*)')
    .eq('id', id)
    .maybeSingle();

  let intake = (withTerm.data || null) as (Intake & { term?: AcademicTerm | null }) | null;
  if (withTerm.error) {
    console.error('Error fetching intake academic period relationship:', withTerm.error);
    const fallback = await supabase.from('intakes').select('*').eq('id', id).maybeSingle();
    if (fallback.error) {
      console.error('Error fetching intake:', fallback.error);
    }
    intake = (fallback.data || null) as Intake | null;
  }

  if (!intake) {
    return { error: 'The selected intake could not be found.' };
  }

  let term = intake.term || null;
  if (!term && intake.term_id) {
    const termResult = await supabase.from('academic_terms').select('*').eq('id', intake.term_id).maybeSingle();
    term = (termResult.data || null) as AcademicTerm | null;
  }
  if (!term && intake.start_date) {
    const overlapping = await supabase
      .from('academic_terms')
      .select('*')
      .lte('start_date', intake.start_date)
      .gte('end_date', intake.start_date)
      .order('is_current', { ascending: false })
      .limit(1);
    term = ((overlapping.data || [])[0] || null) as AcademicTerm | null;
  }

  const existing = await supabase
    .from('timetables')
    .select('academic_year')
    .eq('intake_id', id)
    .not('academic_year', 'is', null)
    .limit(1);

  const existingAcademicYear = existing.data?.[0]?.academic_year || null;
  const academicYear = resolveAcademicPeriod({
    intake,
    term,
    existingAcademicYear,
  });

  if (!academicYear) {
    return {
      error:
        'This intake is not configured with an academic period. Please configure the academic period for this intake before creating a timetable.',
    };
  }

  const backfill: Record<string, string> = {};
  if (!intake.academic_year) backfill.academic_year = academicYear;
  if (term?.id && !intake.term_id) backfill.term_id = term.id;
  if (Object.keys(backfill).length > 0) {
    const { error: backfillError } = await supabase.from('intakes').update(backfill).eq('id', id);
    if (backfillError) {
      console.error('Unable to backfill intake academic period:', backfillError);
    }
  }

  return { academicYear, semester: intake.name || academicYear };
}

export async function checkTimetableConflict(formData: FormData) {
  const supabase = await createClient();

  const day = normalizeDay(formData.get('day') as string);
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const lecturerId = (formData.get('lecturer_id') as string) || '';
  const courseId = (formData.get('course_id') as string) || '';
  const intakeId = (formData.get('intake_id') as string) || '';
  const programId = (formData.get('program_id') as string) || '';
  const roomId = (formData.get('room_id') as string) || '';
  const existingId = (formData.get('id') as string) || '';
  const sharedClassId = (formData.get('shared_class_id') as string) || '';
  const classType = (formData.get('class_type') as string) || 'regular';
  const programmeIds = formData.get('programme_ids') as string || '';

  const conflicts: string[] = [];

  const { data: sameDay, error } = await supabase
    .from('timetables')
    .select('*')
    .eq('day', day)
    .neq('status', 'archived');

  if (error) {
    console.error('Error checking timetable conflicts:', error);
    return ['Unable to verify timetable conflicts. Please try again.'];
  }

  const overlapping = ((sameDay || []) as Timetable[]).filter((row) => {
    if (existingId && row.id === existingId) return false;
    return timesOverlap(row.start_time, row.end_time, startTime, endTime);
  });

  // Check for duplicate programme-intake assignments for shared sessions
  if (classType === 'shared' && programmeIds) {
    const selectedProgramIds = programmeIds.split(',').filter(Boolean);
    
    for (const selectedProgramId of selectedProgramIds) {
      const duplicateAssignment = overlapping.find((row) => {
        if (row.shared_class_id === sharedClassId) return false; // Same session, allowed
        if (!row.programme_assignments) return false;
        
        return row.programme_assignments.some((assignment) =>
          assignment.programme_id === selectedProgramId &&
          assignment.intake_id === intakeId &&
          timeToMinutes(row.start_time) === timeToMinutes(startTime) &&
          timeToMinutes(row.end_time) === timeToMinutes(endTime)
        );
      });

      if (duplicateAssignment) {
        conflicts.push(
          `A class with this programme, intake, unit, day and time (${formatTimeRange(startTime, endTime)}) already exists.`
        );
        break;
      }
    }
  } else {
    // Regular class duplicate check
    const duplicate = overlapping.find(
      (row) =>
        row.program_id === programId &&
        row.intake_id === intakeId &&
        row.course_id === courseId &&
        timeToMinutes(row.start_time) === timeToMinutes(startTime) &&
        timeToMinutes(row.end_time) === timeToMinutes(endTime)
    );

    if (duplicate) {
      conflicts.push(
        `A class with this programme, intake, unit, day and time (${formatTimeRange(startTime, endTime)}) already exists.`
      );
    }
  }

  // Lecturer conflict check - allow same lecturer if part of shared class
  if (lecturerId) {
    const lecturerConflict = overlapping.find((row) => {
      // Skip if same lecturer but part of the same shared class
      if (row.lecturer_id === lecturerId) {
        // If both entries have the same shared_class_id, they're part of the same session
        if (sharedClassId && row.shared_class_id === sharedClassId) {
          return false;
        }
        // If the existing entry is a shared class and we're editing it, allow
        if (existingId && row.shared_class_id && row.id === existingId) {
          return false;
        }
        return true;
      }
      return false;
    });
    
    if (lecturerConflict) {
      conflicts.push(
        `This lecturer is already assigned to another class from ${formatTimeRange(lecturerConflict.start_time, lecturerConflict.end_time)} on ${day}.`
      );
    }
  }

  if (roomId) {
    const roomConflict = overlapping.find((row) => row.room_id === roomId);
    if (roomConflict) {
      conflicts.push(
        `This room is already booked from ${formatTimeRange(roomConflict.start_time, roomConflict.end_time)} on ${day}.`
      );
    }
  }

  return conflicts;
}

export async function createTimetable(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'You must be logged in to create a timetable entry.' };
  }

  const programmeIds = formString(formData, 'programme_ids');
  const courseId = formString(formData, 'course_id');
  const intakeId = formString(formData, 'intake_id');
  const lecturerId = formString(formData, 'lecturer_id');
  const roomId = formString(formData, 'room_id');
  const day = normalizeDay(formString(formData, 'day'));
  const startTime = formString(formData, 'start_time');
  const endTime = formString(formData, 'end_time');
  const status = (formString(formData, 'status') || 'draft').toLowerCase();

  if (!programmeIds) return { error: 'Please select at least one programme.' };
  if (!intakeId) return { error: 'Please select an intake.' };
  if (!courseId) return { error: 'Please select a unit.' };
  // Lecturer is now optional - can be "To Be Confirmed"
  if (!day) return { error: 'Please select a day.' };
  if (!startTime || !endTime) return { error: 'Please select a start and end time.' };
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return { error: 'Start time must be earlier than end time.' };
  }
  if (!['draft', 'active', 'archived'].includes(status)) {
    return { error: 'Please select a valid status.' };
  }

  const selectedProgramIds = programmeIds.split(',').filter(Boolean);
  const isSharedClass = selectedProgramIds.length > 1;
  const classType = isSharedClass ? 'shared' : 'regular';
  
  // Generate shared_class_id for shared classes
  const sharedClassId = isSharedClass ? crypto.randomUUID() : null;

  const period = await resolveIntakeAcademicPeriod(intakeId);
  if ('error' in period) {
    return { error: period.error };
  }
  const academicYear = period.academicYear;
  formData.set('academic_year', academicYear);
  formData.set('day', day);
  formData.set('programme_ids', programmeIds);
  formData.set('intake_id', intakeId);
  formData.set('course_id', courseId);
  formData.set('lecturer_id', lecturerId);
  formData.set('room_id', roomId);
  formData.set('class_type', classType);
  formData.set('shared_class_id', sharedClassId || '');

  // Validate unit availability for all selected programmes
  const { data: course } = await supabase
    .from('courses')
    .select('program_id')
    .eq('id', courseId)
    .single();

  if (!course) {
    return { error: 'The selected unit does not exist.' };
  }

  // For shared classes, check if unit is available in all selected programmes
  if (isSharedClass) {
    const { data: courseProgrammes } = await supabase
      .from('courses')
      .select('program_id')
      .eq('id', courseId);

    const availableProgramIds = (courseProgrammes || []).map((c: any) => c.program_id).filter(Boolean);
    const unavailablePrograms = selectedProgramIds.filter(id => !availableProgramIds.includes(id));
    
    if (unavailablePrograms.length > 0) {
      const { data: programs } = await supabase
        .from('programs')
        .select('name')
        .in('id', unavailablePrograms);
      
      const programNames = (programs || []).map((p: any) => p.name).join(', ');
      return { error: `The selected unit is not configured for: ${programNames}` };
    }
  } else {
    // Regular class - check unit belongs to selected programme
    if (course.program_id !== selectedProgramIds[0]) {
      return { error: 'The selected unit does not belong to the selected programme.' };
    }
  }

  const conflicts = await checkTimetableConflict(formData);
  if (conflicts.length > 0) {
    return { error: conflicts.join(' ') };
  }

  // Create the main timetable session
  const timetableData = {
    academic_year: academicYear,
    semester: period.semester,
    program_id: isSharedClass ? null : selectedProgramIds[0], // null for shared classes
    intake_id: isSharedClass ? null : intakeId, // null for shared classes
    course_id: courseId,
    lecturer_id: lecturerId || null,
    room_id: roomId || null,
    day,
    start_time: startTime,
    end_time: endTime,
    duration: timeToMinutes(endTime) - timeToMinutes(startTime),
    teaching_mode: 'online' as const,
    meeting_link: formData.get('meeting_link') || null,
    status,
    notes: formData.get('notes') || null,
    class_type: classType,
    shared_class_id: sharedClassId,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('timetables')
    .insert(timetableData)
    .select('*')
    .single();

  if (error) {
    console.error('Error inserting timetable:', error);
    return { error: error.message };
  }

  // Create programme assignments for shared classes
  if (isSharedClass) {
    const assignments = selectedProgramIds.map((programId) => ({
      timetable_id: data.id,
      programme_id: programId,
      intake_id: intakeId,
      academic_year: academicYear,
    }));

    const { error: assignmentError } = await supabase
      .from('timetable_programme_assignments')
      .insert(assignments);

    if (assignmentError) {
      console.error('Error creating programme assignments:', assignmentError);
      // Rollback timetable creation
      await supabase.from('timetables').delete().eq('id', data.id);
      return { error: 'Failed to create programme assignments.' };
    }
  }

  await supabase.from('timetable_audit_logs').insert({
    timetable_id: data.id,
    action: 'create',
    previous_value: null,
    new_value: timetableData,
    performed_by: user.id,
    created_at: new Date().toISOString(),
  });

  const [hydrated] = await hydrateTimetables([data as Timetable]);
  revalidateTimetablePaths();

  return { success: true, data: hydrated };
}

export async function updateTimetable(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  formData.set('id', id);

  const programmeIds = formString(formData, 'programme_ids');
  const courseId = formString(formData, 'course_id');
  const intakeId = formString(formData, 'intake_id');
  const lecturerId = formString(formData, 'lecturer_id');
  const roomId = formString(formData, 'room_id');
  const day = normalizeDay(formString(formData, 'day'));
  const startTime = formString(formData, 'start_time');
  const endTime = formString(formData, 'end_time');
  const status = (formString(formData, 'status') || 'draft').toLowerCase();

  if (!programmeIds) return { error: 'Please select at least one programme.' };
  if (!intakeId) return { error: 'Please select an intake.' };
  if (!courseId) return { error: 'Please select a unit.' };
  // Lecturer is now optional - can be "To Be Confirmed"
  if (!day) return { error: 'Please select a day.' };
  if (!startTime || !endTime) return { error: 'Please select a start and end time.' };
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return { error: 'Start time must be earlier than end time.' };
  }
  if (!['draft', 'active', 'archived'].includes(status)) {
    return { error: 'Please select a valid status.' };
  }

  const selectedProgramIds = programmeIds.split(',').filter(Boolean);
  const isSharedClass = selectedProgramIds.length > 1;
  const classType = isSharedClass ? 'shared' : 'regular';

  // Get existing timetable to preserve shared_class_id if needed
  const { data: existingTimetable } = await supabase
    .from('timetables')
    .select('*')
    .eq('id', id)
    .single();

  if (!existingTimetable) {
    return { error: 'Timetable entry not found' };
  }

  const sharedClassId = existingTimetable.shared_class_id || (isSharedClass ? crypto.randomUUID() : null);

  const period = await resolveIntakeAcademicPeriod(intakeId);
  if ('error' in period) {
    return { error: period.error };
  }
  const academicYear = period.academicYear;
  formData.set('academic_year', academicYear);
  formData.set('day', day);
  formData.set('programme_ids', programmeIds);
  formData.set('intake_id', intakeId);
  formData.set('course_id', courseId);
  formData.set('lecturer_id', lecturerId);
  formData.set('room_id', roomId);
  formData.set('class_type', classType);
  formData.set('shared_class_id', sharedClassId || '');

  // Validate unit availability for all selected programmes
  const { data: course } = await supabase
    .from('courses')
    .select('program_id')
    .eq('id', courseId)
    .single();

  if (!course) {
    return { error: 'The selected unit does not exist.' };
  }

  // For shared classes, check if unit is available in all selected programmes
  if (isSharedClass) {
    const { data: courseProgrammes } = await supabase
      .from('courses')
      .select('program_id')
      .eq('id', courseId);

    const availableProgramIds = (courseProgrammes || []).map((c: any) => c.program_id).filter(Boolean);
    const unavailablePrograms = selectedProgramIds.filter(id => !availableProgramIds.includes(id));
    
    if (unavailablePrograms.length > 0) {
      const { data: programs } = await supabase
        .from('programs')
        .select('name')
        .in('id', unavailablePrograms);
      
      const programNames = (programs || []).map((p: any) => p.name).join(', ');
      return { error: `The selected unit is not configured for: ${programNames}` };
    }
  } else {
    // Regular class - check unit belongs to selected programme
    if (course.program_id !== selectedProgramIds[0]) {
      return { error: 'The selected unit does not belong to the selected programme.' };
    }
  }

  const conflicts = await checkTimetableConflict(formData);
  if (conflicts.length > 0) {
    return { error: conflicts.join(' ') };
  }

  // Update the main timetable session
  const timetableData = {
    academic_year: academicYear,
    semester: period.semester,
    program_id: isSharedClass ? null : selectedProgramIds[0],
    intake_id: isSharedClass ? null : intakeId,
    course_id: courseId,
    lecturer_id: lecturerId || null,
    room_id: roomId || null,
    day,
    start_time: startTime,
    end_time: endTime,
    duration: timeToMinutes(endTime) - timeToMinutes(startTime),
    teaching_mode: 'online' as const,
    meeting_link: formData.get('meeting_link') || null,
    status,
    notes: formData.get('notes') || null,
    class_type: classType,
    shared_class_id: sharedClassId,
    updated_by: user.id,
  };

  const { data, error } = await supabase
    .from('timetables')
    .update(timetableData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  // Update programme assignments for shared classes
  if (isSharedClass) {
    // Delete existing assignments
    await supabase
      .from('timetable_programme_assignments')
      .delete()
      .eq('timetable_id', id);

    // Create new assignments
    const assignments = selectedProgramIds.map((programId) => ({
      timetable_id: id,
      programme_id: programId,
      intake_id: intakeId,
      academic_year: academicYear,
    }));

    const { error: assignmentError } = await supabase
      .from('timetable_programme_assignments')
      .insert(assignments);

    if (assignmentError) {
      console.error('Error updating programme assignments:', assignmentError);
      return { error: 'Failed to update programme assignments.' };
    }
  } else {
    // For regular classes, remove any existing assignments
    await supabase
      .from('timetable_programme_assignments')
      .delete()
      .eq('timetable_id', id);
  }

  const [hydrated] = await hydrateTimetables([data as Timetable]);
  revalidateTimetablePaths();

  return { success: true, data: hydrated };
}

export async function deleteTimetable(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('timetables')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidateTimetablePaths();

  return { success: true };
}

export async function publishTimetable(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get current timetable to check conflicts before publishing
  const { data: currentTimetable } = await supabase
    .from('timetables')
    .select('*')
    .eq('id', id)
    .single();

  if (!currentTimetable) {
    return { error: 'Timetable entry not found' };
  }

  // Create FormData for conflict checking
  const formData = new FormData();
  formData.set('id', id);
  formData.set('day', currentTimetable.day);
  formData.set('start_time', currentTimetable.start_time);
  formData.set('end_time', currentTimetable.end_time);
  formData.set('lecturer_id', currentTimetable.lecturer_id || '');
  formData.set('course_id', currentTimetable.course_id || '');
  formData.set('intake_id', currentTimetable.intake_id || '');
  formData.set('program_id', currentTimetable.program_id || '');
  formData.set('academic_year', currentTimetable.academic_year);
  formData.set('class_type', currentTimetable.class_type || 'regular');
  formData.set('shared_class_id', currentTimetable.shared_class_id || '');

  // Check for conflicts
  const conflicts = await checkTimetableConflict(formData);
  if (conflicts.length > 0) {
    return { error: `Cannot publish: ${conflicts.join('. ')}` };
  }

  const { error } = await supabase
    .from('timetables')
    .update({ 
      status: 'active',
      published_by: user.id,
      published_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidateTimetablePaths();

  return { success: true };
}

export async function unpublishTimetable(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('timetables')
    .update({ 
      status: 'draft',
      updated_by: user.id
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidateTimetablePaths();

  return { success: true };
}

export async function getStudentTimetable() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { student: null, timetables: [], timeSlots: [], programme: null, intake: null };
  }

  try {
    // Get student record with programme and intake
    const { data: student } = await supabase
      .from('students')
      .select('*, program:programs(*), intake:intakes(*)')
      .eq('profile_id', user.id)
      .single();

    if (!student) {
      return { student: null, timetables: [], timeSlots: [], programme: null, intake: null };
    }

    // Get enrolled courses
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', student.id)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) {
      return { student, timetables: [], timeSlots: [], programme: student.program, intake: student.intake };
    }

    const courseIds = enrollments.map((enrollment) => enrollment.course_id);

    // Get time slots
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('*')
      .order('start_time', { ascending: true });

    // Get timetable entries for enrolled courses with programme assignments
    const { data: timetables, error } = await supabase
      .from('timetables')
      .select('*, programme_assignments:timetable_programme_assignments(*)')
      .in('course_id', courseIds)
      .eq('status', 'active')
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching student timetable:', error);
      return { student, timetables: [], timeSlots: timeSlots || [], programme: student.program, intake: student.intake };
    }

    // Filter for shared sessions where student's programme is included
    const filteredTimetables = (timetables || []).filter((timetable) => {
      if (timetable.class_type !== 'shared') {
        return true; // Regular classes for enrolled courses are always included
      }

      // For shared classes, check if student's programme is in the assignments
      if (timetable.programme_assignments && timetable.programme_assignments.length > 0) {
        return timetable.programme_assignments.some(
          (assignment: TimetableProgrammeAssignment) => assignment.programme_id === student.program_id
        );
      }

      return false;
    });

    return {
      student,
      timetables: await hydrateTimetables(filteredTimetables),
      timeSlots: timeSlots || [],
      programme: student.program,
      intake: student.intake,
    };
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    return { student: null, timetables: [], timeSlots: [], programme: null, intake: null };
  }
}

export async function getLecturerTimetable() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { lecturer: null, timetables: [] as Timetable[], totalHours: 0 };
  }

  try {
    const { data: timetables, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('lecturer_id', user.id)
      .eq('status', 'active')
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching lecturer timetable:', error);
      return { lecturer: user, timetables: [] as Timetable[], totalHours: 0 };
    }

    const hydrated = await hydrateTimetables((timetables || []) as Timetable[]);
    const totalHours = hydrated.reduce(
      (sum, entry) => sum + durationMinutes(entry.start_time, entry.end_time) / 60,
      0
    );

    return { lecturer: user, timetables: hydrated, totalHours };
  } catch (error) {
    console.error('Error fetching lecturer timetable:', error);
    return { lecturer: user, timetables: [], totalHours: 0 };
  }
}

export async function exportTimetableToCSV() {
  const timetables = await fetchTimetableRows();

  if (!timetables || timetables.length === 0) {
    return { error: 'No timetable entries to export' };
  }

  const headers = [
    'Academic Year',
    'Intake',
    'Program',
    'Department',
    'Campus',
    'Unit Code',
    'Unit Name',
    'Lecturer',
    'Room',
    'Building',
    'Day',
    'Start Time',
    'End Time',
    'Teaching Mode',
    'Status',
  ];

  const rows = timetables.map((tt) => [
    tt.academic_year,
    tt.intake?.name || tt.semester || '',
    tt.program?.name || '',
    tt.department || '',
    tt.campus,
    tt.course?.code || '',
    tt.course?.name || '',
    tt.lecturer?.full_name || '',
    tt.room?.name || '',
    tt.room?.building || '',
    tt.day,
    tt.start_time,
    tt.end_time,
    tt.teaching_mode,
    tt.status,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell || ''}"`).join(',')),
  ].join('\n');

  return { success: true, csvContent, filename: `timetable-export-${new Date().toISOString().split('T')[0]}.csv` };
}

export async function importTimetableFromCSV(csvContent: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'You must be logged in to import timetables.' };
  }

  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
  
  const errors: string[] = [];
  const imported: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map((v) => v.replace(/"/g, '').trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header.toLowerCase().replace(/ /g, '_')] = values[index];
      });

      // Validate required fields
      if (!row.day || !row.start_time || !row.end_time) {
        errors.push(`Row ${i + 1}: Missing required fields (day, start_time, end_time)`);
        continue;
      }

      // Check for conflicts
      const conflictData = new FormData();
      conflictData.set('day', row.day);
      conflictData.set('start_time', row.start_time);
      conflictData.set('end_time', row.end_time);
      
      if (row.room) {
        const { data: roomData } = await supabase.from('rooms').select('id').eq('name', row.room).single();
        if (roomData) conflictData.set('room_id', roomData.id);
      }
      
      if (row.lecturer) {
        const { data: lecturerData } = await supabase.from('profiles').select('id').eq('full_name', row.lecturer).single();
        if (lecturerData) conflictData.set('lecturer_id', lecturerData.id);
      }

      const conflicts = await checkTimetableConflict(conflictData);
      if (conflicts.length > 0) {
        errors.push(`Row ${i + 1}: ${conflicts.join('. ')}`);
        continue;
      }

      // Create timetable entry
      const timetableData: any = {
        academic_year: row.academic_year || '2026/2027',
        semester: row.semester || 'Semester 1',
        department: row.department || null,
        campus: row.campus || 'Main Campus',
        day: row.day,
        start_time: row.start_time,
        end_time: row.end_time,
        teaching_mode: row.teaching_mode || 'physical',
        status: row.status || 'draft',
        created_by: user.id,
      };

      const { data: courseData } = await supabase.from('courses').select('id').eq('code', row.unit_code).single();
      if (courseData) timetableData.course_id = courseData.id;

      const { data: programData } = await supabase.from('programs').select('id').eq('name', row.program).single();
      if (programData) timetableData.program_id = programData.id;

      const { data: created } = await supabase.from('timetables').insert(timetableData).select().single();
      
      if (created) {
        imported.push(created);
      }
    } catch (error) {
      errors.push(`Row ${i + 1}: Failed to process - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  revalidatePath('/dashboard/timetable');
  revalidatePath('/dashboard/timetable/list');

  return {
    success: true,
    imported: imported.length,
    errors,
    total: lines.length - 1,
  };
}

// Lecturer Management Actions
export async function getLecturers() {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching lecturers:', error);
      return [];
    }
    return (data || []) as Profile[];
  } catch (error) {
    console.error('Error fetching lecturers:', error);
    return [];
  }
}

export async function updateLecturer(lecturerId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'You must be logged in to update lecturer information.' };
  }

  const lecturerData = {
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone') || null,
    staff_number: formData.get('staff_number') || null,
    department: formData.get('department') || null,
    specialization: formData.get('specialization') || null,
    employment_status: formData.get('employment_status') || 'active',
    can_teach: formData.get('can_teach') === 'true',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(lecturerData)
    .eq('id', lecturerId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/timetable');
  revalidatePath('/dashboard/users');

  return { success: true, data };
}

export async function toggleLecturerCanTeach(lecturerId: string, canTeach: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'You must be logged in to update lecturer permissions.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ can_teach: canTeach, updated_at: new Date().toISOString() })
    .eq('id', lecturerId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/timetable');
  revalidatePath('/dashboard/users');

  return { success: true, data };
}

export async function getLecturerWorkload(lecturerId: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('lecturer_id', lecturerId)
      .eq('status', 'active')
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching lecturer workload:', error);
      return [];
    }
    return hydrateTimetables((data || []) as Timetable[]);
  } catch (error) {
    console.error('Error fetching lecturer workload:', error);
    return [];
  }
}
