'use server';

import { createClient } from '@/lib/supabase/server';
import type { LmsLearningActivity, Course, OnlineLesson } from '@/lib/types';

export async function getLearningActivitiesByCourse(courseId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('lms_learning_activities')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching learning activities:', error);
    return [];
  }

  return data as LmsLearningActivity[];
}

export async function getLearningActivityById(activityId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('lms_learning_activities')
    .select(`
      *,
      course:courses(*),
      creator:profiles(id, full_name, email),
      updater:profiles(id, full_name, email)
    `)
    .eq('id', activityId)
    .single();

  if (error) {
    console.error('Error fetching learning activity:', error);
    return null;
  }

  return data as LmsLearningActivity;
}

export async function createLearningActivity(formData: FormData) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const courseId = formData.get('course_id') as string;
  const name = formData.get('name') as string;
  const externalUrl = formData.get('external_url') as string;
  const description = formData.get('description') as string | null;
  const displayDescription = formData.get('display_description') === 'true';
  const provider = formData.get('provider') as 'zoom' | 'microsoft_teams' | 'google_meet' | 'moodle' | 'external_link';
  const launchMode = formData.get('launch_mode') as 'iframe' | 'zoom_sdk' | 'same_tab';
  const status = formData.get('status') as 'active' | 'inactive';

  // Validate URL
  try {
    const url = new URL(externalUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { success: false, error: 'URL must use http:// or https://' };
    }
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }

  const { data, error } = await supabase
    .from('lms_learning_activities')
    .insert({
      course_id: courseId,
      name,
      external_url: externalUrl,
      description,
      display_description: displayDescription,
      provider,
      launch_mode: launchMode,
      status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating learning activity:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function updateLearningActivity(activityId: string, formData: FormData) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const externalUrl = formData.get('external_url') as string;
  const description = formData.get('description') as string | null;
  const displayDescription = formData.get('display_description') === 'true';
  const provider = formData.get('provider') as 'zoom' | 'microsoft_teams' | 'google_meet' | 'moodle' | 'external_link';
  const launchMode = formData.get('launch_mode') as 'iframe' | 'zoom_sdk' | 'same_tab';
  const status = formData.get('status') as 'active' | 'inactive';

  // Validate URL
  try {
    const url = new URL(externalUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { success: false, error: 'URL must use http:// or https://' };
    }
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }

  const { data, error } = await supabase
    .from('lms_learning_activities')
    .update({
      name,
      external_url: externalUrl,
      description,
      display_description: displayDescription,
      provider,
      launch_mode: launchMode,
      status,
      updated_by: user.id,
    })
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    console.error('Error updating learning activity:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function deleteLearningActivity(activityId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('lms_learning_activities')
    .delete()
    .eq('id', activityId);

  if (error) {
    console.error('Error deleting learning activity:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getStudentLearningActivities() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get student's enrolled courses
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('id, program_id')
    .eq('profile_id', user.id)
    .single();

  if (studentError || !studentData) {
    console.error('Error fetching student:', studentError);
    return [];
  }

  // Get active enrollments
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('course_id, course:courses(*)')
    .eq('student_id', studentData.id)
    .eq('status', 'active');

  if (enrollmentError) {
    console.error('Error fetching enrollments:', enrollmentError);
    return [];
  }

  if (!enrollments || enrollments.length === 0) {
    return [];
  }

  const courseIds = enrollments.map(e => e.course_id);

  // Get active learning activities for enrolled courses
  const { data: activities, error: activitiesError } = await supabase
    .from('lms_learning_activities')
    .select(`
      *,
      course:courses(*)
    `)
    .in('course_id', courseIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (activitiesError) {
    console.error('Error fetching learning activities:', activitiesError);
    return [];
  }

  return activities as LmsLearningActivity[];
}

export async function getStudentLearningActivitiesByCourse(courseId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Verify student is enrolled in this course
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (studentError || !studentData) {
    return [];
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentData.id)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .single();

  if (enrollmentError || !enrollment) {
    return [];
  }

  // Get active learning activities for this course
  const { data: activities, error: activitiesError } = await supabase
    .from('lms_learning_activities')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (activitiesError) {
    console.error('Error fetching learning activities:', activitiesError);
    return [];
  }

  return activities as LmsLearningActivity[];
}

// ONLINE LESSONS ACTIONS

export async function getOnlineLessonsByCourse(courseId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*),
      lecturer:profiles(id, full_name, email),
      creator:profiles(id, full_name, email),
      updater:profiles(id, full_name, email)
    `)
    .eq('course_id', courseId)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching online lessons:', error);
    return [];
  }

  return data as OnlineLesson[];
}

export async function getOnlineLessonById(lessonId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*),
      lecturer:profiles(id, full_name, email),
      creator:profiles(id, full_name, email),
      updater:profiles(id, full_name, email)
    `)
    .eq('id', lessonId)
    .single();

  if (error) {
    console.error('Error fetching online lesson:', error);
    return null;
  }

  return data as OnlineLesson[];
}

export async function createOnlineLesson(formData: FormData) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const courseId = formData.get('course_id') as string;
  const title = formData.get('title') as string;
  const topic = formData.get('topic') as string | null;
  const description = formData.get('description') as string | null;
  const lecturerId = formData.get('lecturer_id') as string | null;
  const lecturerName = formData.get('lecturer_name') as string | null;
  const zoomJoinUrl = formData.get('zoom_join_url') as string;
  const zoomMeetingId = formData.get('zoom_meeting_id') as string | null;
  const zoomPasscode = formData.get('zoom_passcode') as string | null;
  const scheduledDate = formData.get('scheduled_date') as string;
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const durationMinutes = formData.get('duration_minutes') as string | null;
  const recordingUrl = formData.get('recording_url') as string | null;
  const thumbnailUrl = formData.get('thumbnail_url') as string | null;
  const classType = formData.get('class_type') as 'live_class' | 'recorded_class';
  const isPublished = formData.get('is_published') === 'true';

  // Validate Zoom URL
  try {
    const url = new URL(zoomJoinUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { success: false, error: 'Zoom URL must use http:// or https://' };
    }
  } catch {
    return { success: false, error: 'Invalid Zoom URL format' };
  }

  // Validate times
  if (startTime >= endTime) {
    return { success: false, error: 'End time must be after start time' };
  }

  const { data, error } = await supabase
    .from('online_lessons')
    .insert({
      course_id: courseId,
      title,
      topic,
      description,
      lecturer_id: lecturerId,
      lecturer_name: lecturerName,
      zoom_join_url: zoomJoinUrl,
      zoom_meeting_id: zoomMeetingId,
      zoom_passcode: zoomPasscode,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      recording_url: recordingUrl,
      thumbnail_url: thumbnailUrl,
      class_type: classType,
      status: 'scheduled',
      is_published: isPublished,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating online lesson:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function updateOnlineLesson(lessonId: string, formData: FormData) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const title = formData.get('title') as string;
  const topic = formData.get('topic') as string | null;
  const description = formData.get('description') as string | null;
  const lecturerId = formData.get('lecturer_id') as string | null;
  const lecturerName = formData.get('lecturer_name') as string | null;
  const zoomJoinUrl = formData.get('zoom_join_url') as string;
  const zoomMeetingId = formData.get('zoom_meeting_id') as string | null;
  const zoomPasscode = formData.get('zoom_passcode') as string | null;
  const scheduledDate = formData.get('scheduled_date') as string;
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const durationMinutes = formData.get('duration_minutes') as string | null;
  const recordingUrl = formData.get('recording_url') as string | null;
  const thumbnailUrl = formData.get('thumbnail_url') as string | null;
  const classType = formData.get('class_type') as 'live_class' | 'recorded_class';
  const status = formData.get('status') as 'scheduled' | 'live' | 'completed' | 'cancelled';
  const isPublished = formData.get('is_published') === 'true';

  // Validate Zoom URL
  try {
    const url = new URL(zoomJoinUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { success: false, error: 'Zoom URL must use http:// or https://' };
    }
  } catch {
    return { success: false, error: 'Invalid Zoom URL format' };
  }

  // Validate times
  if (startTime >= endTime) {
    return { success: false, error: 'End time must be after start time' };
  }

  const { data, error } = await supabase
    .from('online_lessons')
    .update({
      title,
      topic,
      description,
      lecturer_id: lecturerId,
      lecturer_name: lecturerName,
      zoom_join_url: zoomJoinUrl,
      zoom_meeting_id: zoomMeetingId,
      zoom_passcode: zoomPasscode,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      recording_url: recordingUrl,
      thumbnail_url: thumbnailUrl,
      class_type: classType,
      status,
      is_published: isPublished,
      updated_by: user.id,
    })
    .eq('id', lessonId)
    .select()
    .single();

  if (error) {
    console.error('Error updating online lesson:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function deleteOnlineLesson(lessonId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('online_lessons')
    .delete()
    .eq('id', lessonId);

  if (error) {
    console.error('Error deleting online lesson:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getStudentOnlineLessons() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get student's enrolled courses
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('id, program_id')
    .eq('profile_id', user.id)
    .single();

  if (studentError || !studentData) {
    console.error('Error fetching student:', studentError);
    return [];
  }

  // Get active enrollments
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentData.id)
    .eq('status', 'active');

  if (enrollmentError) {
    console.error('Error fetching enrollments:', enrollmentError);
    return [];
  }

  if (!enrollments || enrollments.length === 0) {
    return [];
  }

  const courseIds = enrollments.map(e => e.course_id);

  // Get published online lessons for enrolled courses
  const { data: lessons, error: lessonsError } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*),
      lecturer:profiles(id, full_name, email)
    `)
    .in('course_id', courseIds)
    .eq('is_published', true)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (lessonsError) {
    console.error('Error fetching online lessons:', lessonsError);
    return [];
  }

  return lessons as OnlineLesson[];
}

export async function getStudentOnlineLessonsByCourse(courseId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Verify student is enrolled in this course
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (studentError || !studentData) {
    return [];
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentData.id)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .single();

  if (enrollmentError || !enrollment) {
    return [];
  }

  // Get published online lessons for this course
  const { data: lessons, error: lessonsError } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*),
      lecturer:profiles(id, full_name, email)
    `)
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (lessonsError) {
    console.error('Error fetching online lessons:', lessonsError);
    return [];
  }

  return lessons as OnlineLesson[];
}

export async function calculateLessonStatus(lesson: OnlineLesson): Promise<'scheduled' | 'live' | 'completed' | 'cancelled'> {
  if (lesson.status === 'cancelled') return 'cancelled';
  
  const now = new Date();
  const scheduledDate = new Date(lesson.scheduled_date);
  const [startHours, startMinutes] = lesson.start_time.split(':').map(Number);
  const [endHours, endMinutes] = lesson.end_time.split(':').map(Number);
  
  const startTime = new Date(scheduledDate);
  startTime.setHours(startHours, startMinutes, 0, 0);
  
  const endTime = new Date(scheduledDate);
  endTime.setHours(endHours, endMinutes, 0, 0);
  
  if (now < startTime) return 'scheduled';
  if (now >= startTime && now <= endTime) return 'live';
  return 'completed';
}
