'use server';

import { createClient } from '@/lib/supabase/server';
import type { Timetable, Room, TimeSlot, Profile, Program, Course, Intake } from '@/lib/types';
import { revalidatePath } from 'next/cache';
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

  const [programs, courses, lecturers, intakes, rooms] = await Promise.all([
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
      ? supabase.from('intakes').select('*').in('id', intakeIds)
      : Promise.resolve({ data: [] as Intake[] }),
    roomIds.length
      ? supabase.from('rooms').select('*').in('id', roomIds)
      : Promise.resolve({ data: [] as Room[] }),
  ]);

  const programMap = mapById(programs.data as Program[] | null);
  const courseMap = mapById(courses.data as Course[] | null);
  const lecturerMap = mapById(lecturers.data as Profile[] | null);
  const intakeMap = mapById(intakes.data as Intake[] | null);
  const roomMap = mapById(rooms.data as Room[] | null);

  return rows.map((row) => ({
    ...row,
    day: normalizeDay(row.day),
    start_time: formatClockTime(row.start_time),
    end_time: formatClockTime(row.end_time),
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
  let query = supabase.from('timetables').select('*');

  if (filters?.programId) query = query.eq('program_id', filters.programId);
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
      supabase.from('intakes').select('*').order('start_date', { ascending: false }),
      supabase.from('rooms').select('*').order('name', { ascending: true }),
    ]);

    return {
      programs: (programs.data || []) as Program[],
      courses: (courses.data || []) as Course[],
      lecturers: (lecturers.data || []) as Profile[],
      timeSlots: (timeSlots.data || []) as TimeSlot[],
      intakes: (intakes.data || []) as Intake[],
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

async function resolveAcademicYear(intakeId: string | null, provided?: string | null) {
  if (provided) return provided;
  if (!intakeId) return '';

  const supabase = await createClient();
  const { data: intake } = await supabase
    .from('intakes')
    .select('academic_year, start_date, name')
    .eq('id', intakeId)
    .single();

  if (intake?.academic_year) return intake.academic_year;
  if (intake?.start_date) {
    const year = new Date(intake.start_date).getFullYear();
    return `${year}/${year + 1}`;
  }
  return intake?.name || '';
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

  if (lecturerId) {
    const lecturerConflict = overlapping.find((row) => row.lecturer_id === lecturerId);
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

  const programId = formData.get('program_id') as string;
  const courseId = formData.get('course_id') as string;
  const intakeId = formData.get('intake_id') as string;
  const lecturerId = formData.get('lecturer_id') as string;
  const roomId = (formData.get('room_id') as string) || '';
  const day = normalizeDay(formData.get('day') as string);
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const status = ((formData.get('status') as string) || 'draft').toLowerCase();

  if (!programId) return { error: 'Please select a programme.' };
  if (!intakeId) return { error: 'Please select an intake.' };
  if (!courseId) return { error: 'Please select a unit.' };
  if (!lecturerId) return { error: 'Please select a lecturer for this class.' };
  if (!day) return { error: 'Please select a day.' };
  if (!startTime || !endTime) return { error: 'Please select a start and end time.' };
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return { error: 'Start time must be earlier than end time.' };
  }
  if (!['draft', 'active', 'archived'].includes(status)) {
    return { error: 'Please select a valid status.' };
  }

  const academicYear = await resolveAcademicYear(intakeId, formData.get('academic_year') as string);
  if (!academicYear) {
    return { error: 'The selected intake does not have an academic period.' };
  }
  formData.set('academic_year', academicYear);
  formData.set('day', day);

  const { data: course } = await supabase
    .from('courses')
    .select('program_id')
    .eq('id', courseId)
    .single();

  if (!course) {
    return { error: 'The selected unit does not exist.' };
  }

  if (course.program_id !== programId) {
    return { error: 'The selected unit does not belong to the selected programme.' };
  }

  const { data: intake } = await supabase.from('intakes').select('name').eq('id', intakeId).single();

  const conflicts = await checkTimetableConflict(formData);
  if (conflicts.length > 0) {
    return { error: conflicts.join(' ') };
  }

  const timetableData = {
    academic_year: academicYear,
    semester: intake?.name || academicYear,
    program_id: programId,
    intake_id: intakeId,
    course_id: courseId,
    lecturer_id: lecturerId,
    room_id: roomId || null,
    day,
    start_time: startTime,
    end_time: endTime,
    duration: timeToMinutes(endTime) - timeToMinutes(startTime),
    teaching_mode: 'online' as const,
    meeting_link: formData.get('meeting_link') || null,
    status,
    notes: formData.get('notes') || null,
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

  const programId = formData.get('program_id') as string;
  const courseId = formData.get('course_id') as string;
  const intakeId = formData.get('intake_id') as string;
  const lecturerId = formData.get('lecturer_id') as string;
  const roomId = (formData.get('room_id') as string) || '';
  const day = normalizeDay(formData.get('day') as string);
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const status = ((formData.get('status') as string) || 'draft').toLowerCase();

  if (!programId) return { error: 'Please select a programme.' };
  if (!intakeId) return { error: 'Please select an intake.' };
  if (!courseId) return { error: 'Please select a unit.' };
  if (!lecturerId) return { error: 'Please select a lecturer for this class.' };
  if (!day) return { error: 'Please select a day.' };
  if (!startTime || !endTime) return { error: 'Please select a start and end time.' };
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return { error: 'Start time must be earlier than end time.' };
  }
  if (!['draft', 'active', 'archived'].includes(status)) {
    return { error: 'Please select a valid status.' };
  }

  const academicYear = await resolveAcademicYear(intakeId, formData.get('academic_year') as string);
  formData.set('academic_year', academicYear);
  formData.set('day', day);

  const { data: intake } = await supabase.from('intakes').select('name').eq('id', intakeId).single();

  const conflicts = await checkTimetableConflict(formData);
  if (conflicts.length > 0) {
    return { error: conflicts.join(' ') };
  }

  const timetableData = {
    academic_year: academicYear,
    semester: intake?.name || academicYear,
    program_id: programId,
    intake_id: intakeId,
    course_id: courseId,
    lecturer_id: lecturerId,
    room_id: roomId || null,
    day,
    start_time: startTime,
    end_time: endTime,
    duration: timeToMinutes(endTime) - timeToMinutes(startTime),
    teaching_mode: 'online' as const,
    meeting_link: formData.get('meeting_link') || null,
    status,
    notes: formData.get('notes') || null,
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
    return { student: null, timetables: [] };
  }

  try {
    // Get student record
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('profile_id', user.id)
      .single();

    if (!student) {
      return { student: null, timetables: [] };
    }

    // Get enrolled courses
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', student.id)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) {
      return { student, timetables: [] };
    }

    const courseIds = enrollments.map((enrollment) => enrollment.course_id);

    const { data: timetables, error } = await supabase
      .from('timetables')
      .select('*')
      .in('course_id', courseIds)
      .eq('status', 'active')
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching student timetable:', error);
      return { student, timetables: [] as Timetable[] };
    }

    return { student, timetables: await hydrateTimetables((timetables || []) as Timetable[]) };
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    return { student: null, timetables: [] };
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
