'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getStudentLearningActivities, getStudentOnlineLessons } from '@/app/actions/lms';
import { getCourses } from '@/app/actions/courses';
import { calculateLessonStatus } from '@/lib/lms-utils';
import type { Student, LmsLearningActivity, OnlineLesson } from '@/lib/types';
import { BookOpen, Video, Loader2, Search, Calendar, Clock, Users, CheckCircle, ArrowRight } from 'lucide-react';

export function StudentMyLearningClient({ student }: { student: Student }) {
  const [activities, setActivities] = useState<LmsLearningActivity[]>([]);
  const [onlineLessons, setOnlineLessons] = useState<OnlineLesson[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveLesson, setLiveLesson] = useState<OnlineLesson | null>(null);

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
  
  // Group online lessons by course
  const lessonsByCourse = onlineLessons.reduce((acc, lesson) => {
    const courseId = lesson.course_id;
    if (!acc[courseId]) {
      acc[courseId] = {
        course: lesson.course,
        lessons: [],
      };
    }
    acc[courseId].lessons.push(lesson);
    return acc;
  }, {} as Record<string, { course: any; lessons: OnlineLesson[] }>);
  
  // Calculate statistics
  const enrolledUnits = Object.keys(activitiesByCourse).length;
  const upcomingLessons = onlineLessons.filter(lesson => {
    return calculateLessonStatus(lesson) === 'upcoming';
  }).length;
  
  const completedLessons = onlineLessons.filter(lesson => {
    return calculateLessonStatus(lesson) === 'completed';
  }).length;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTime(timeStr: string) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  function handleJoinClass(lesson: OnlineLesson) {
    window.open(lesson.zoom_url, '_blank', 'noopener,noreferrer');
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
            Total Classes
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{onlineLessons.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            Upcoming
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{upcomingLessons}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle className="h-4 w-4" />
            Completed
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
      {Object.keys(lessonsByCourse).length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Video className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No online classes scheduled</h3>
          <p className="text-slate-600">Check back later for upcoming online classes.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(lessonsByCourse).map(([courseId, { course, lessons }]) => {
            const courseName = course?.name || course?.code || 'Unknown Unit';
            const courseCode = course?.code || '';
            
            const filteredLessons = lessons.filter(lesson => {
              const searchLower = searchQuery.toLowerCase();
              return (
                lesson.title.toLowerCase().includes(searchLower) ||
                (lesson.topic && lesson.topic.toLowerCase().includes(searchLower)) ||
                courseName.toLowerCase().includes(searchLower)
              );
            });

            if (filteredLessons.length === 0) return null;

            return (
              <div key={courseId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{courseCode} {courseName}</h3>
                      <p className="text-sm text-slate-600 mt-1">{filteredLessons.length} online class{filteredLessons.length !== 1 ? 'es' : ''}</p>
                    </div>
                    <Link href={`/student/lms/my-learning/units/${courseId}`}>
                      <Button variant="ghost" size="sm">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-slate-200">
                  {filteredLessons.map((lesson) => {
                    const status = calculateLessonStatus(lesson);
                    return (
                      <div key={lesson.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {status === 'live' && (
                                <Badge variant="destructive">LIVE NOW</Badge>
                              )}
                              {status === 'upcoming' && (
                                <Badge variant="default">UPCOMING</Badge>
                              )}
                              {status === 'completed' && (
                                <Badge variant="secondary">COMPLETED</Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                            {lesson.topic && (
                              <p className="text-sm text-slate-600 mt-1">{lesson.topic}</p>
                            )}
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
                          </div>
                          <div className="ml-4">
                            {status === 'live' ? (
                              <Button
                                onClick={() => handleJoinClass(lesson)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Join Live Class
                              </Button>
                            ) : status === 'upcoming' ? (
                              <Button variant="secondary">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
