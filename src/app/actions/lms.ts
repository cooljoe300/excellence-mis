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
  } = await (supabase.auth as any).getUser();

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
  } = await (supabase.auth as any).getUser();

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
  } = await (supabase.auth as any).getUser();

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
  } = await (supabase.auth as any).getUser();

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
  } = await (supabase.auth as any).getUser();

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

// ONLINE LESSONS ACTIONS - Simplified for Zoom class publishing

export async function getOnlineLessonsByCourse(courseId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*)
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
      course:courses(*)
    `)
    .eq('id', lessonId)
    .single();

  if (error) {
    console.error('Error fetching online lesson:', error);
    return null;
  }

  return data as OnlineLesson;
}

export async function getAllOnlineLessons() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*)
    `)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching all online lessons:', error);
    return [];
  }

  return data as OnlineLesson[];
}

export interface RecordedClassLessonStats {
  totalViews: number;
  uniqueViewers: number;
}

export interface RecordedClassLesson extends OnlineLesson {
  stats: RecordedClassLessonStats;
}

export interface RecordedClassUnitGroup {
  courseId: string | null;
  code: string | null;
  name: string;
  assigned: boolean;
  lessonCount: number;
  totalViews: number;
  publishedCount: number;
  lessons: RecordedClassLesson[];
}

export interface RecordedClassProgramGroup {
  programId: string | null;
  code: string | null;
  name: string;
  unitCount: number;
  lessonCount: number;
  totalViews: number;
  publishedCount: number;
  draftCount: number;
  units: RecordedClassUnitGroup[];
}

export interface RecordedClassesData {
  programs: RecordedClassProgramGroup[];
  stats: {
    totalClasses: number;
    publishedClasses: number;
    totalViews: number;
    uniqueViewers: number;
    programCount: number;
    unitCount: number;
  };
}

export async function getRecordedClassesHierarchy(): Promise<RecordedClassesData> {
  const supabase = await createClient();

  const emptyStats = {
    totalClasses: 0,
    publishedClasses: 0,
    totalViews: 0,
    uniqueViewers: 0,
    programCount: 0,
    unitCount: 0,
  };

  const { data: lessons, error } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*),
      program:programs(*)
    `)
    .eq('class_type', 'recorded')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recorded classes:', error);
    return { programs: [], stats: emptyStats };
  }

  const typedLessons = (lessons || []) as OnlineLesson[];

  // Single query for all view stats (avoids N+1 per lesson)
  const views: { online_lesson_id: string; student_id: string }[] = [];
  if (typedLessons.length > 0) {
    const { data: viewData } = await supabase
      .from('recorded_class_views')
      .select('online_lesson_id, student_id')
      .in('online_lesson_id', typedLessons.map(l => l.id));
    if (viewData) views.push(...viewData);
  }

  const viewsByLesson = new Map<string, { totalViews: number; viewers: Set<string> }>();
  const allViewers = new Set<string>();
  for (const view of views) {
    allViewers.add(view.student_id);
    const entry = viewsByLesson.get(view.online_lesson_id) || { totalViews: 0, viewers: new Set<string>() };
    entry.totalViews++;
    entry.viewers.add(view.student_id);
    viewsByLesson.set(view.online_lesson_id, entry);
  }

  const programMap = new Map<string, RecordedClassProgramGroup>();

  for (const lesson of typedLessons) {
    const viewStats = viewsByLesson.get(lesson.id) || { totalViews: 0, viewers: new Set<string>() };

    const programKey = lesson.program_id || '__no_program__';
    let programGroup = programMap.get(programKey);
    if (!programGroup) {
      programGroup = {
        programId: lesson.program_id,
        code: lesson.program?.code ?? null,
        name: lesson.program?.name ?? 'Unknown Programme',
        unitCount: 0,
        lessonCount: 0,
        totalViews: 0,
        publishedCount: 0,
        draftCount: 0,
        units: [],
      };
      programMap.set(programKey, programGroup);
    }

    const course = lesson.course ?? null;
    const unitKey = course?.id ?? '__unassigned__';
    let unitGroup = programGroup.units.find(u => (u.courseId ?? '__unassigned__') === unitKey);
    if (!unitGroup) {
      unitGroup = {
        courseId: course?.id ?? null,
        code: course?.code ?? null,
        name: course ? (course.code && course.name !== course.code ? `${course.code} – ${course.name}` : course.code || course.name) : 'Unit Not Assigned',
        assigned: !!course,
        lessonCount: 0,
        totalViews: 0,
        publishedCount: 0,
        lessons: [],
      };
      programGroup.units.push(unitGroup);
    }

    unitGroup.lessons.push({
      ...lesson,
      stats: { totalViews: viewStats.totalViews, uniqueViewers: viewStats.viewers.size },
    });
  }

  // Aggregate counts and sort groups alphabetically
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const programs = Array.from(programMap.values())
    .sort((a, b) => collator.compare(a.name, b.name))
    .map(programGroup => {
      programGroup.units.sort((a, b) => {
        if (!a.assigned) return 1;
        if (!b.assigned) return -1;
        return collator.compare(a.code || a.name, b.code || b.name);
      });

      for (const unitGroup of programGroup.units) {
        unitGroup.lessonCount = unitGroup.lessons.length;
        unitGroup.totalViews = unitGroup.lessons.reduce((sum, l) => sum + l.stats.totalViews, 0);
        unitGroup.publishedCount = unitGroup.lessons.filter(l => l.is_published).length;

        programGroup.lessonCount += unitGroup.lessonCount;
        programGroup.totalViews += unitGroup.totalViews;
        programGroup.publishedCount += unitGroup.publishedCount;
      }
      programGroup.draftCount = programGroup.lessonCount - programGroup.publishedCount;
      programGroup.unitCount = programGroup.units.filter(u => u.assigned).length;

      return programGroup;
    });

  return {
    programs,
    stats: {
      totalClasses: typedLessons.length,
      publishedClasses: typedLessons.filter(l => l.is_published).length,
      totalViews: views.length,
      uniqueViewers: allViewers.size,
      programCount: programs.length,
      unitCount: programs.reduce((sum, p) => sum + p.unitCount, 0),
    },
  };
}

export async function createOnlineLesson(formData: FormData) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const courseId = formData.get('course_id') as string;
  const programId = formData.get('program_id') as string | null;
  const title = formData.get('title') as string;
  const topic = formData.get('topic') as string | null;
  const description = formData.get('description') as string | null;
  const scheduledDate = formData.get('scheduled_date') as string | null;
  const startTime = formData.get('start_time') as string | null;
  const endTime = formData.get('end_time') as string | null;
  const zoomUrl = formData.get('zoom_url') as string | null;
  const recordingUrl = formData.get('recording_url') as string | null;
  const zoomMeetingId = formData.get('zoom_meeting_id') as string | null;
  const passcode = formData.get('passcode') as string | null;
  const classType = formData.get('class_type') as 'live' | 'recorded' | null;
  const isPublished = formData.get('is_published') === 'true';

  // Get program_id and unit_name from the selected course (source of truth),
  // falling back to the explicitly selected programme if the course lookup fails
  let finalProgramId = programId;
  let unitName = null;
  
  if (courseId) {
    const { data: course } = await supabase
      .from('courses')
      .select('program_id, name')
      .eq('id', courseId)
      .single();
    
    if (course) {
      finalProgramId = course.program_id ?? programId;
      unitName = course.name;
    }
  }

  // For recorded classes, recording_url is required
  if (classType === 'recorded' && !recordingUrl) {
    return { success: false, error: 'Recording URL is required for recorded classes' };
  }

  // For live classes, scheduling is required
  if (classType === 'live' && (!scheduledDate || !startTime || !endTime || !zoomUrl)) {
    return { success: false, error: 'Scheduled date, time, and Zoom URL are required for live classes' };
  }

  // Validate URLs if provided
  if (zoomUrl) {
    try {
      const url = new URL(zoomUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { success: false, error: 'Zoom URL must use http:// or https://' };
      }
    } catch {
      return { success: false, error: 'Invalid Zoom URL format' };
    }
  }

  if (recordingUrl) {
    try {
      const url = new URL(recordingUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { success: false, error: 'Recording URL must use http:// or https://' };
      }
    } catch {
      return { success: false, error: 'Invalid recording URL format' };
    }
  }

  // Validate times for live classes
  if (startTime && endTime && startTime >= endTime) {
    return { success: false, error: 'End time must be after start time' };
  }

  const { data, error } = await supabase
    .from('online_lessons')
    .insert({
      course_id: courseId,
      program_id: finalProgramId,
      unit_name: unitName,
      title,
      topic,
      description,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      zoom_url: zoomUrl,
      recording_url: recordingUrl,
      zoom_meeting_id: zoomMeetingId,
      passcode,
      class_type: classType || 'live',
      is_published: isPublished,
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
  } = await (supabase.auth as any).getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const courseId = formData.get('course_id') as string;
  const programId = formData.get('program_id') as string | null;
  const title = formData.get('title') as string;
  const topic = formData.get('topic') as string | null;
  const description = formData.get('description') as string | null;
  const scheduledDate = formData.get('scheduled_date') as string | null;
  const startTime = formData.get('start_time') as string | null;
  const endTime = formData.get('end_time') as string | null;
  const zoomUrl = formData.get('zoom_url') as string | null;
  const recordingUrl = formData.get('recording_url') as string | null;
  const zoomMeetingId = formData.get('zoom_meeting_id') as string | null;
  const passcode = formData.get('passcode') as string | null;
  const classType = formData.get('class_type') as 'live' | 'recorded' | null;
  const isPublished = formData.get('is_published') === 'true';

  // Get program_id and unit_name from the selected course (source of truth),
  // falling back to the explicitly selected programme if the course lookup fails
  let finalProgramId = programId;
  let unitName = null;
  
  if (courseId) {
    const { data: course } = await supabase
      .from('courses')
      .select('program_id, name')
      .eq('id', courseId)
      .single();
    
    if (course) {
      finalProgramId = course.program_id ?? programId;
      unitName = course.name;
    }
  }

  // Validate URLs if provided
  if (zoomUrl) {
    try {
      const url = new URL(zoomUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { success: false, error: 'Zoom URL must use http:// or https://' };
      }
    } catch {
      return { success: false, error: 'Invalid Zoom URL format' };
    }
  }

  if (recordingUrl) {
    try {
      const url = new URL(recordingUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { success: false, error: 'Recording URL must use http:// or https://' };
      }
    } catch {
      return { success: false, error: 'Invalid recording URL format' };
    }
  }

  // Validate times for live classes
  if (startTime && endTime && startTime >= endTime) {
    return { success: false, error: 'End time must be after start time' };
  }

  const { data, error } = await supabase
    .from('online_lessons')
    .update({
      course_id: courseId,
      program_id: finalProgramId,
      unit_name: unitName,
      title,
      topic,
      description,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      zoom_url: zoomUrl,
      recording_url: recordingUrl,
      zoom_meeting_id: zoomMeetingId,
      passcode,
      class_type: classType,
      is_published: isPublished,
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
  } = await (supabase.auth as any).getUser();

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

export async function trackRecordedClassView(lessonId: string, studentId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('recorded_class_views')
    .insert({
      online_lesson_id: lessonId,
      student_id: studentId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error tracking view:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function getRecordedClassViewStats(lessonId: string) {
  const supabase = await createClient();
  
  const { data: views, error } = await supabase
    .from('recorded_class_views')
    .select('student_id, viewed_at')
    .eq('online_lesson_id', lessonId);

  if (error) {
    console.error('Error getting view stats:', error);
    return { totalViews: 0, uniqueViewers: 0, lastViewed: null };
  }

  const totalViews = views?.length || 0;
  const uniqueViewers = new Set(views?.map(v => v.student_id)).size;
  const lastViewed = views?.length > 0 
    ? views.sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())[0].viewed_at
    : null;

  return { totalViews, uniqueViewers, lastViewed };
}

export async function getAllRecordedClassViewStats() {
  const supabase = await createClient();
  
  const { data: views, error } = await supabase
    .from('recorded_class_views')
    .select('online_lesson_id, student_id, viewed_at');

  if (error) {
    console.error('Error getting all view stats:', error);
    return { totalViews: 0, uniqueViewers: 0 };
  }

  const totalViews = views?.length || 0;
  const uniqueViewers = new Set(views?.map(v => v.student_id)).size;

  return { totalViews, uniqueViewers };
}

export async function getRecordedClassViewStatsMap(lessonIds: string[]) {
  const supabase = await createClient();
  
  const { data: views, error } = await supabase
    .from('recorded_class_views')
    .select('online_lesson_id, student_id, viewed_at')
    .in('online_lesson_id', lessonIds);

  if (error) {
    console.error('Error getting lesson view stats:', error);
    return {};
  }

  const statsMap: Record<string, { totalViews: number; uniqueViewers: number; lastViewed: string | null }> = {};
  
  // Initialize all lessons with 0 views
  lessonIds.forEach(id => {
    statsMap[id] = { totalViews: 0, uniqueViewers: 0, lastViewed: null };
  });

  // Count views per lesson
  if (views) {
    views.forEach(view => {
      if (!statsMap[view.online_lesson_id]) {
        statsMap[view.online_lesson_id] = { totalViews: 0, uniqueViewers: 0, lastViewed: null };
      }
      
      statsMap[view.online_lesson_id].totalViews++;
      
      // Track last viewed time
      if (!statsMap[view.online_lesson_id].lastViewed || 
          new Date(view.viewed_at) > new Date(statsMap[view.online_lesson_id].lastViewed || '')) {
        statsMap[view.online_lesson_id].lastViewed = view.viewed_at;
      }
    });

    // Count unique students per lesson
    lessonIds.forEach(lessonId => {
      const lessonViews = views.filter(v => v.online_lesson_id === lessonId);
      const uniqueStudents = new Set(lessonViews.map(v => v.student_id)).size;
      statsMap[lessonId].uniqueViewers = uniqueStudents;
    });
  }

  return statsMap;
}

// Student actions - get lessons for enrolled courses only
export async function getStudentOnlineLessons(studentId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*),
      program:programs(*)
    `)
    .eq('is_published', true)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching student online lessons:', error);
    return [];
  }

  // Filter by enrollment (RLS handles this, but we double-check for safety)
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('status', 'active');

  if (!enrollments) {
    return [];
  }

  const enrolledCourseIds = enrollments.map(e => e.course_id);
  return (data as OnlineLesson[]).filter(lesson => 
    enrolledCourseIds.includes(lesson.course_id)
  );
}

export async function getStudentOnlineLessonsByCourse(studentId: string, courseId: string) {
  const supabase = await createClient();
  
  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .single();

  if (!enrollment) {
    return [];
  }

  const { data, error } = await supabase
    .from('online_lessons')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching student online lessons by course:', error);
    return [];
  }

  return data as OnlineLesson[];
}
