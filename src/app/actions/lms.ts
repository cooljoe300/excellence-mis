'use server';

import { createClient } from '@/lib/supabase/server';
import type { LmsLearningActivity, Course } from '@/lib/types';

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
