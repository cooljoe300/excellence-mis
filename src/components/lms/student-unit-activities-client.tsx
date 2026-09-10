'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getStudentLearningActivitiesByCourse, getStudentOnlineLessonsByCourse } from '@/app/actions/lms';
import { calculateLessonStatus } from '@/lib/lms-utils';
import type { Student, Course, LmsLearningActivity, OnlineLesson } from '@/lib/types';
import { ArrowLeft, Video, ExternalLink, Loader2, Calendar, Clock, Search, Timer } from 'lucide-react';

export function StudentUnitActivitiesClient({ 
  student, 
  course 
}: { 
  student: Student; 
  course: Course 
}) {
  const [activities, setActivities] = useState<LmsLearningActivity[]>([]);
  const [onlineLessons, setOnlineLessons] = useState<OnlineLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recorded' | 'upcoming' | 'live' | 'completed'>('all');
  const [previewLesson, setPreviewLesson] = useState<OnlineLesson | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  async function loadData() {
    setLoading(true);
    try {
      const [activitiesData, lessonsData] = await Promise.all([
        getStudentLearningActivitiesByCourse(course.id),
        getStudentOnlineLessonsByCourse(student.id, course.id)
      ]);
      setActivities(activitiesData);
      setOnlineLessons(lessonsData);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [student.id, course.id]);

  // Filter lessons based on search and status
  const filteredLessons = onlineLessons.filter(lesson => {
    const isRecorded = lesson.class_type === 'recorded';
    const status = isRecorded ? 'recorded' : calculateLessonStatus(lesson);
    
    // Status filter
    if (filter === 'recorded' && !isRecorded) return false;
    if (filter === 'upcoming' && status !== 'upcoming') return false;
    if (filter === 'live' && status !== 'live') return false;
    if (filter === 'completed' && status !== 'completed') return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return lesson.title.toLowerCase().includes(query) ||
             (lesson.topic && lesson.topic.toLowerCase().includes(query));
    }
    
    return true;
  });

  // Dynamic status calculation for rendering
  const lessonsWithStatus = filteredLessons.map(lesson => ({
    ...lesson,
    calculatedStatus: lesson.class_type === 'recorded' ? 'recorded' : calculateLessonStatus(lesson)
  }));

  // Update countdowns every second
  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {};
      
      lessonsWithStatus.forEach(lesson => {
        // Skip recorded classes for countdown
        if (lesson.class_type === 'recorded') return;
        
        if (lesson.calculatedStatus === 'upcoming') {
          const now = new Date();
          const scheduledDate = new Date(lesson.scheduled_date);
          const [startHours, startMinutes] = lesson.start_time.split(':').map(Number);
          
          const startTime = new Date(scheduledDate);
          startTime.setHours(startHours, startMinutes, 0, 0);
          
          const diff = startTime.getTime() - now.getTime();
          
          if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            if (hours > 0) {
              newCountdowns[lesson.id] = `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
              newCountdowns[lesson.id] = `${minutes}m ${seconds}s`;
            } else {
              newCountdowns[lesson.id] = `${seconds}s`;
            }
          }
        }
      });
      
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [lessonsWithStatus]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  function handleJoinClass(lesson: OnlineLesson) {
    const url = lesson.class_type === 'recorded' ? lesson.recording_url : lesson.zoom_url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/student/lms/my-learning">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Learning
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{course.code} - {course.name}</h1>
          <p className="text-slate-600 mt-1">Online classes and learning activities</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'recorded' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('recorded')}
          >
            Recorded
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={filter === 'live' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('live')}
          >
            Live
          </Button>
          <Button
            variant={filter === 'completed' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Online Classes */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Online Classes</h2>
        
        {lessonsWithStatus.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Video className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No online classes scheduled</h3>
            <p className="text-slate-600">Check back later for upcoming online classes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lessonsWithStatus.map((lesson) => {
              const status = lesson.calculatedStatus;
              const isRecorded = lesson.class_type === 'recorded';
              return (
                <div key={lesson.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isRecorded && (
                          <Badge variant="secondary">RECORDED CLASS</Badge>
                        )}
                        {!isRecorded && status === 'live' && (
                          <Badge variant="destructive">LIVE NOW</Badge>
                        )}
                        {!isRecorded && status === 'upcoming' && (
                          <Badge variant="default">UPCOMING</Badge>
                        )}
                        {!isRecorded && status === 'completed' && (
                          <Badge variant="secondary">COMPLETED</Badge>
                        )}
                        {!isRecorded && status === 'upcoming' && countdowns[lesson.id] && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Timer className="h-4 w-4" />
                            {countdowns[lesson.id]}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900">{lesson.title}</h3>
                      {lesson.topic && (
                        <p className="text-sm text-slate-600 mt-1">{lesson.topic}</p>
                      )}
                      {lesson.description && (
                        <p className="text-sm text-slate-600 mt-2">{lesson.description}</p>
                      )}
                      {!isRecorded && lesson.scheduled_date && (
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(lesson.scheduled_date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(lesson.start_time)} – {formatTime(lesson.end_time)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      {isRecorded ? (
                        <Button
                          onClick={() => handleJoinClass(lesson)}
                          variant="secondary"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Watch Recording
                        </Button>
                      ) : status === 'live' ? (
                        <Button
                          onClick={() => handleJoinClass(lesson)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Join Live Class
                        </Button>
                      ) : status === 'upcoming' ? (
                        <Button
                          variant="secondary"
                          onClick={() => setPreviewLesson(lesson)}
                        >
                          Preview
                        </Button>
                      ) : (
                        <Button variant="ghost" disabled>
                          Completed
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Learning Activities */}
      {activities.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Learning Activities</h2>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{activity.name}</h3>
                    {activity.description && activity.display_description && (
                      <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{activity.provider}</Badge>
                      {activity.status === 'active' && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <Link href={`/student/lms/activities/${activity.id}`}>
                      <Button variant="secondary" size="sm">
                        Open
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Class Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewLesson(null)}
                >
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Unit</label>
                  <p className="text-slate-900 mt-1">{course.code} - {course.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700">Class</label>
                  <p className="text-slate-900 mt-1">{previewLesson.title}</p>
                  {previewLesson.topic && (
                    <p className="text-slate-600 mt-1">{previewLesson.topic}</p>
                  )}
                </div>
                
                {previewLesson.class_type === 'recorded' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">RECORDED CLASS</Badge>
                    </div>
                    {(() => {
                      const passcode = previewLesson.passcode;
                      if (!passcode) return null;
                      return (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Recording Passcode</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(passcode);
                              }}
                              className="text-sm text-slate-600 hover:text-slate-900"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-slate-900 font-mono">{passcode}</p>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Date</label>
                      <p className="text-slate-900 mt-1">{formatDate(previewLesson.scheduled_date)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700">Time</label>
                      <p className="text-slate-900 mt-1">
                        {formatTime(previewLesson.start_time)} – {formatTime(previewLesson.end_time)}
                      </p>
                    </div>
                  </>
                )}
                
                {previewLesson.description && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <p className="text-slate-900 mt-1">{previewLesson.description}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {previewLesson.class_type === 'recorded' ? 'RECORDED CLASS' : 'ZOOM ONLINE CLASS'}
                  </p>
                  <Button
                    onClick={() => handleJoinClass(previewLesson)}
                    className="w-full"
                  >
                    {previewLesson.class_type === 'recorded' ? 'Watch Recording' : 'Join Class'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
