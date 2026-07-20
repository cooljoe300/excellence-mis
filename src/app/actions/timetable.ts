'use server';

import { createClient } from '@/lib/supabase/server';
import type { Timetable, Room, TimeSlot } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function getTimetableStats() {
  const supabase = await createClient();
  
  const [
    totalTimetables,
    activeTimetables,
    totalRooms,
    totalTimeSlots,
    todayClasses,
  ] = await Promise.all([
    supabase.from('timetables').select('*', { count: 'exact', head: true }),
    supabase.from('timetables').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('rooms').select('*', { count: 'exact', head: true }),
    supabase.from('time_slots').select('*', { count: 'exact', head: true }),
    supabase.from('timetables').select('*', { count: 'exact', head: true }).eq('day', new Date().toLocaleDateString('en-US', { weekday: 'long' })),
  ]);

  return {
    totalTimetables: totalTimetables.count || 0,
    activeTimetables: activeTimetables.count || 0,
    totalRooms: totalRooms.count || 0,
    totalTimeSlots: totalTimeSlots.count || 0,
    todayClasses: todayClasses.count || 0,
  };
}

export async function getTimetables() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('timetables')
    .select('*, program:programs(*), course:courses(*), lecturer:profiles(*), room:rooms(*)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data || []) as Timetable[];
}

export async function getRooms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as Room[];
}

export async function getTimeSlots() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data || []) as TimeSlot[];
}

export async function getTimetableFormData() {
  const supabase = await createClient();
  
  const [programs, courses, lecturers, rooms, timeSlots, intakes, terms] = await Promise.all([
    supabase.from('programs').select('*').order('name', { ascending: true }),
    supabase.from('courses').select('*').order('name', { ascending: true }),
    supabase.from('profiles').select('*').eq('role', 'teacher').order('full_name', { ascending: true }),
    supabase.from('rooms').select('*').order('name', { ascending: true }),
    supabase.from('time_slots').select('*').order('start_time', { ascending: true }),
    supabase.from('intakes').select('*').order('name', { ascending: true }),
    supabase.from('academic_terms').select('*').order('name', { ascending: true }),
  ]);

  return {
    programs: programs.data || [],
    courses: courses.data || [],
    lecturers: lecturers.data || [],
    rooms: rooms.data || [],
    timeSlots: timeSlots.data || [],
    intakes: intakes.data || [],
    terms: terms.data || [],
  };
}

export async function checkTimetableConflict(formData: FormData) {
  const supabase = await createClient();
  
  const day = formData.get('day') as string;
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const roomId = formData.get('room_id') as string;
  const lecturerId = formData.get('lecturer_id') as string;
  const courseId = formData.get('course_id') as string;

  const conflicts: string[] = [];

  // Check room conflict
  if (roomId) {
    const { data: roomConflict } = await supabase
      .from('timetables')
      .select('*')
      .eq('day', day)
      .eq('room_id', roomId)
      .or(`start_time.lte.${endTime}&end_time.gte.${startTime}`)
      .neq('status', 'archived');

    if (roomConflict && roomConflict.length > 0) {
      conflicts.push('Room is already occupied at this time');
    }
  }

  // Check lecturer conflict
  if (lecturerId) {
    const { data: lecturerConflict } = await supabase
      .from('timetables')
      .select('*')
      .eq('day', day)
      .eq('lecturer_id', lecturerId)
      .or(`start_time.lte.${endTime}&end_time.gte.${startTime}`)
      .neq('status', 'archived');

    if (lecturerConflict && lecturerConflict.length > 0) {
      conflicts.push('Lecturer has another class at this time');
    }
  }

  // Check course conflict
  if (courseId) {
    const { data: courseConflict } = await supabase
      .from('timetables')
      .select('*')
      .eq('day', day)
      .eq('course_id', courseId)
      .or(`start_time.lte.${endTime}&end_time.gte.${startTime}`)
      .neq('status', 'archived');

    if (courseConflict && courseConflict.length > 0) {
      conflicts.push('This course already has a class at this time');
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

  // Check for conflicts
  const conflicts = await checkTimetableConflict(formData);
  if (conflicts.length > 0) {
    return { error: conflicts.join('. ') };
  }

  const timetableData = {
    academic_year: formData.get('academic_year'),
    semester: formData.get('semester'),
    program_id: formData.get('program_id') || null,
    department: formData.get('department') || null,
    campus: formData.get('campus') || 'Main Campus',
    intake_id: formData.get('intake_id') || null,
    class_section: formData.get('class_section') || null,
    course_id: formData.get('course_id') || null,
    lecturer_id: formData.get('lecturer_id') || null,
    room_id: formData.get('room_id') || null,
    day: formData.get('day'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    duration: formData.get('duration') ? parseInt(formData.get('duration') as string) : null,
    max_students: formData.get('max_students') ? parseInt(formData.get('max_students') as string) : null,
    teaching_mode: formData.get('teaching_mode') || 'physical',
    meeting_link: formData.get('meeting_link') || null,
    status: formData.get('status') || 'draft',
    notes: formData.get('notes') || null,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('timetables')
    .insert(timetableData)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Log the creation
  await supabase.from('timetable_audit_logs').insert({
    timetable_id: data.id,
    action: 'create',
    previous_value: null,
    new_value: timetableData,
    performed_by: user.id,
    created_at: new Date().toISOString(),
  });

  revalidatePath('/dashboard/timetable');
  revalidatePath('/dashboard/timetable/list');

  return { success: true, data };
}

export async function getStudentTimetable() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { student: null, timetables: [] };
  }

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

  const courseIds = enrollments.map(e => e.course_id);

  // Get timetable entries for enrolled courses
  const { data: timetables } = await supabase
    .from('timetables')
    .select('*, course:courses(*), lecturer:profiles(*), room:rooms(*)')
    .in('course_id', courseIds)
    .eq('status', 'active')
    .order('day')
    .order('start_time');

  return { student, timetables: timetables || [] };
}

export async function getLecturerTimetable() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { lecturer: null, timetables: [] };
  }

  // Get timetable entries for this lecturer
  const { data: timetables } = await supabase
    .from('timetables')
    .select('*, course:courses(*), lecturer:profiles(*), room:rooms(*), program:programs(*)')
    .eq('lecturer_id', user.id)
    .eq('status', 'active')
    .order('day')
    .order('start_time');

  // Calculate teaching load
  const totalHours = timetables?.reduce((sum, tt) => {
    const start = new Date(`2000-01-01T${tt.start_time}`);
    const end = new Date(`2000-01-01T${tt.end_time}`);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0) || 0;

  return { lecturer: user, timetables: timetables || [], totalHours };
}

export async function exportTimetableToCSV() {
  const supabase = await createClient();
  const { data: timetables } = await supabase
    .from('timetables')
    .select('*, course:courses(*), lecturer:profiles(*), room:rooms(*), program:programs(*)')
    .order('day')
    .order('start_time');

  if (!timetables || timetables.length === 0) {
    return { error: 'No timetable entries to export' };
  }

  const headers = [
    'Academic Year',
    'Semester',
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
    tt.semester,
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
