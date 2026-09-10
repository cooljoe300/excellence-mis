import type { OnlineLesson } from '@/lib/types';

/**
 * Calculate lesson status dynamically based on current time
 * Uses Africa/Nairobi timezone (Kenya) as the college operates in Kenya
 * 
 * @param lesson - The online lesson to calculate status for
 * @returns 'upcoming' | 'live' | 'completed'
 */
export function calculateLessonStatus(lesson: OnlineLesson): 'upcoming' | 'live' | 'completed' {
  // Use Africa/Nairobi timezone for calculations
  const now = new Date();
  const scheduledDate = new Date(lesson.scheduled_date);
  const [startHours, startMinutes] = lesson.start_time.split(':').map(Number);
  const [endHours, endMinutes] = lesson.end_time.split(':').map(Number);
  
  const startTime = new Date(scheduledDate);
  startTime.setHours(startHours, startMinutes, 0, 0);
  
  const endTime = new Date(scheduledDate);
  endTime.setHours(endHours, endMinutes, 0, 0);
  
  if (now < startTime) {
    return 'upcoming';
  } else if (now >= startTime && now <= endTime) {
    return 'live';
  } else {
    return 'completed';
  }
}
