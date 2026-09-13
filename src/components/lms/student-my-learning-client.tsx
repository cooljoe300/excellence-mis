'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getStudentLearningActivities, getStudentOnlineLessons, trackRecordedClassView } from '@/app/actions/lms';
import { getCourses } from '@/app/actions/courses';
import { calculateLessonStatus } from '@/lib/lms-utils';
import type { Student, LmsLearningActivity, OnlineLesson } from '@/lib/types';
import { BookOpen, Video, Loader2, Search, Calendar, Clock, Users, CheckCircle, ArrowRight, Copy, Phone } from 'lucide-react';

export function StudentMyLearningClient({ student }: { student: Student }) {
  const [activities, setActivities] = useState<LmsLearningActivity[]>([]);
  const [onlineLessons, setOnlineLessons] = useState<OnlineLesson[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveLesson, setLiveLesson] = useState<OnlineLesson | null>(null);
  const [copiedField, setCopiedField] = useState<{ field: string; lessonId: string } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [activitiesData, lessonsData, coursesData] = await Promise.all([
        getStudentLearningActivities(),
        getStudentOnlineLessons(student.id),
        getCourses()
      ]);
      
      setActivities(activitiesData);
      setOnlineLessons(lessonsData);
      setCourses(coursesData);
      
      // Find current live lesson
      const live = lessonsData.find(lesson => {
        return calculateLessonStatus(lesson) === 'live';
      });
      
      setLiveLesson(live || null);
    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [student.id]);

  // Group activities by course
  const activitiesByCourse = activities.reduce((acc, activity) => {
    const courseId = activity.course_id;
    if (!acc[courseId]) {
      acc[courseId] = {
        course: activity.course,
        activities: [],
      };
    }
    acc[courseId].activities.push(activity);
    return acc;
  }, {} as Record<string, { course: any; activities: LmsLearningActivity[] }>);
  
  // Group online lessons by program first, then by course
  const lessonsByProgram = onlineLessons.reduce((acc, lesson) => {
    const programId = lesson.program_id || 'no-program';
    const programName = (lesson.program as any)?.name || 'Other';
    
    if (!acc[programId]) {
      acc[programId] = {
        program: lesson.program,
        programName,
        courses: {},
      };
    }
    
    const courseId = lesson.course_id;
    if (!acc[programId].courses[courseId]) {
      acc[programId].courses[courseId] = {
        course: lesson.course,
        lessons: [],
      };
    }
    
    acc[programId].courses[courseId].lessons.push(lesson);
    return acc;
  }, {} as Record<string, { program: any; programName: string; courses: Record<string, { course: any; lessons: OnlineLesson[] }> }>);
  
  // Calculate statistics
  const enrolledUnits = Object.keys(activitiesByCourse).length;
  const totalClasses = onlineLessons.length;
  const recordedClasses = onlineLessons.filter(lesson => lesson.class_type === 'recorded').length;
  const upcomingLessons = onlineLessons.filter(lesson => {
    return lesson.class_type !== 'recorded' && calculateLessonStatus(lesson) === 'upcoming';
  }).length;
  
  const completedLessons = onlineLessons.filter(lesson => {
    return lesson.class_type !== 'recorded' && calculateLessonStatus(lesson) === 'completed';
  }).length;

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
      // Track view for recorded classes
      if (lesson.class_type === 'recorded' && student.id) {
        trackRecordedClassView(lesson.id, student.id).catch(err => {
          console.error('Failed to track view:', err);
        });
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async function copyToClipboard(text: string | null, field: string, lessonId: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField({ field, lessonId });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  function isFieldCopied(field: string, lessonId: string): boolean {
    return copiedField?.lessonId === lessonId && copiedField.field === field;
  }

  function extractMeetingId(zoomUrl: string | null): string | null {
    if (!zoomUrl) return null;
    try {
      const url = new URL(zoomUrl);
      const pathParts = url.pathname.split('/');
      const meetingId = pathParts[pathParts.length - 1];
      return meetingId || null;
    } catch {
      return null;
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Learning</h1>
        <p className="text-slate-600 mt-1">Your enrolled units and online classes</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <BookOpen className="h-4 w-4" />
            Enrolled Units
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{enrolledUnits}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Video className="h-4 w-4" />
            Recorded Classes
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{recordedClasses}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            Upcoming Live
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{upcomingLessons}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle className="h-4 w-4" />
            Completed Live
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{completedLessons}</div>
        </div>
      </div>

      {/* Live Class Banner */}
      {liveLesson && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="font-semibold">LIVE NOW</span>
              </div>
              <h3 className="text-xl font-bold">{liveLesson.title}</h3>
              {liveLesson.topic && (
                <p className="text-red-100 mt-1">{liveLesson.topic}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-red-100">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(liveLesson.scheduled_date)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(liveLesson.start_time)} – {formatTime(liveLesson.end_time)}
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleJoinClass(liveLesson)}
              className="bg-white text-red-600 hover:bg-red-50"
            >
              Join Live Class
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search units or classes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Units with Online Classes */}
      {Object.keys(lessonsByProgram).length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Video className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No online classes scheduled</h3>
          <p className="text-slate-600">Check back later for upcoming online classes.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(lessonsByProgram).map(([programId, { program, programName, courses }]) => {
            const allLessons = Object.values(courses).flatMap(c => c.lessons);
            
            const filteredLessons = allLessons.filter(lesson => {
              const searchLower = searchQuery.toLowerCase();
              return (
                lesson.title.toLowerCase().includes(searchLower) ||
                (lesson.topic && lesson.topic.toLowerCase().includes(searchLower)) ||
                programName.toLowerCase().includes(searchLower)
              );
            });

            if (filteredLessons.length === 0) return null;

            return (
              <div key={programId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div>
                    <h3 className="font-semibold text-slate-900">{programName}</h3>
                    <p className="text-sm text-slate-600 mt-1">{Object.keys(courses).length} unit{Object.keys(courses).length !== 1 ? 's' : ''} • {filteredLessons.length} class{filteredLessons.length !== 1 ? 'es' : ''}</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-200">
                  {Object.entries(courses).map(([courseId, { course, lessons }]) => {
                    const courseName = course?.name || course?.code || 'Unknown Unit';
                    const courseCode = course?.code || '';
                    
                    const courseFilteredLessons = lessons.filter(lesson => {
                      const searchLower = searchQuery.toLowerCase();
                      return (
                        lesson.title.toLowerCase().includes(searchLower) ||
                        (lesson.topic && lesson.topic.toLowerCase().includes(searchLower)) ||
                        courseName.toLowerCase().includes(searchLower)
                      );
                    });

                    if (courseFilteredLessons.length === 0) return null;

                    return (
                      <div key={courseId} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="mb-3">
                          <h4 className="font-medium text-slate-900">{courseCode} {courseName}</h4>
                          <p className="text-sm text-slate-600">{courseFilteredLessons.length} class{courseFilteredLessons.length !== 1 ? 'es' : ''}</p>
                        </div>
                        <div className="space-y-3">
                          {courseFilteredLessons.map((lesson) => {
                            const isRecorded = lesson.class_type === 'recorded';
                            const status = isRecorded ? 'recorded' : calculateLessonStatus(lesson);
                            const meetingId = lesson.zoom_meeting_id || extractMeetingId(lesson.zoom_url);
                            
                            return (
                              <div key={lesson.id} className="flex flex-col gap-4">
                                {/* Lesson Header */}
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
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
                                    </div>
                                    <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                                    {lesson.topic && (
                                      <p className="text-sm text-slate-600 mt-1">{lesson.topic}</p>
                                    )}
                                    {!isRecorded && lesson.scheduled_date && (
                                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
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
                                </div>

                                {/* Zoom Details Section */}
                                {!isRecorded && (
                                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                                    <div className="text-sm font-medium text-slate-700">Zoom Meeting Details</div>
                                    
                                    {/* Meeting ID */}
                                    {meetingId && (
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="text-xs text-slate-500 mb-1">Meeting ID</div>
                                          <div className="font-mono text-sm bg-white px-2 py-1 rounded border border-slate-200">
                                            {meetingId}
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(meetingId, 'meetingId', lesson.id)}
                                          className="ml-2"
                                        >
                                          {isFieldCopied('meetingId', lesson.id) ? (
                                            <span className="text-green-600">✓ Copied</span>
                                          ) : (
                                            <>
                                              <Copy className="h-4 w-4 mr-1" />
                                              Copy
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}

                                    {/* Passcode */}
                                    {lesson.passcode && (
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="text-xs text-slate-500 mb-1">Passcode</div>
                                          <div className="font-mono text-sm bg-white px-2 py-1 rounded border border-slate-200">
                                            {lesson.passcode}
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(lesson.passcode, 'passcode', lesson.id)}
                                          className="ml-2"
                                        >
                                          {isFieldCopied('passcode', lesson.id) ? (
                                            <span className="text-green-600">✓ Copied</span>
                                          ) : (
                                            <>
                                              <Copy className="h-4 w-4 mr-1" />
                                              Copy
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}

                                    {/* Meeting Link */}
                                    {lesson.zoom_url && (
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="text-xs text-slate-500 mb-1">Meeting Link</div>
                                          <div className="text-xs bg-white px-2 py-1 rounded border border-slate-200 truncate">
                                            {lesson.zoom_url}
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(lesson.zoom_url, 'link', lesson.id)}
                                          className="ml-2"
                                        >
                                          {isFieldCopied('link', lesson.id) ? (
                                            <span className="text-green-600">✓ Copied</span>
                                          ) : (
                                            <>
                                              <Copy className="h-4 w-4 mr-1" />
                                              Copy
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Join Button */}
                                <div className="flex justify-end">
                                  {isRecorded ? (
                                    <Button
                                      onClick={() => handleJoinClass(lesson)}
                                      variant="secondary"
                                      className="w-full sm:w-auto"
                                    >
                                      <Video className="h-4 w-4 mr-2" />
                                      Watch Recording
                                    </Button>
                                  ) : status === 'live' ? (
                                    <Button
                                      onClick={() => handleJoinClass(lesson)}
                                      className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                                    >
                                      <Phone className="h-4 w-4 mr-2" />
                                      Join Zoom
                                    </Button>
                                  ) : status === 'upcoming' ? (
                                    <Button variant="secondary" disabled className="w-full sm:w-auto">
                                      Upcoming
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" disabled className="w-full sm:w-auto">
                                      Completed
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
