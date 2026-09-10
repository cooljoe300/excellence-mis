'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getStudentLearningActivities, getStudentOnlineLessons } from '@/app/actions/lms';
import { getCourses } from '@/app/actions/courses';
import type { Student, LmsLearningActivity, OnlineLesson } from '@/lib/types';
import { BookOpen, Video, Loader2, Search, Calendar, Clock, Users, CheckCircle, ArrowRight, TrendingUp } from 'lucide-react';

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
        getStudentOnlineLessons(),
        getCourses()
      ]);
      
      setActivities(activitiesData);
      setOnlineLessons(lessonsData);
      setCourses(coursesData);
      
      // Find current live lesson
      const now = new Date();
      const live = lessonsData.find(lesson => {
        const scheduledDate = new Date(lesson.scheduled_date);
        const [startHours, startMinutes] = lesson.start_time.split(':').map(Number);
        const [endHours, endMinutes] = lesson.end_time.split(':').map(Number);
        
        const startTime = new Date(scheduledDate);
        startTime.setHours(startHours, startMinutes, 0, 0);
        
        const endTime = new Date(scheduledDate);
        endTime.setHours(endHours, endMinutes, 0, 0);
        
        return now >= startTime && now <= endTime && lesson.status !== 'cancelled';
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
  }, []);

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
    const scheduledDate = new Date(lesson.scheduled_date);
    const [startHours, startMinutes] = lesson.start_time.split(':').map(Number);
    const startTime = new Date(scheduledDate);
    startTime.setHours(startHours, startMinutes, 0, 0);
    return new Date() < startTime && lesson.status !== 'cancelled';
  }).length;
  
  const thisWeekLessons = onlineLessons.filter(lesson => {
    const scheduledDate = new Date(lesson.scheduled_date);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return scheduledDate >= now && scheduledDate <= weekFromNow && lesson.status !== 'cancelled';
  }).length;
  
  const completedLessons = onlineLessons.filter(lesson => lesson.status === 'completed').length;
  
  // Filter courses based on search
  const filteredCourses = Object.values(activitiesByCourse).filter(({ course }) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return course.name.toLowerCase().includes(query) || 
           course.code.toLowerCase().includes(query);
  });

  return (
    <div>
      <PageHeader
        title="My Learning"
        description={`Welcome back, ${student.first_name} 👋`}
      />

      {/* Live Class Banner */}
      {liveLesson && (
        <div className="mb-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-3 w-3 bg-white rounded-full animate-pulse" />
              <div>
                <h3 className="font-semibold">🔴 LIVE CLASS AVAILABLE</h3>
                <p className="text-sm opacity-90">{liveLesson.title}</p>
                {liveLesson.topic && <p className="text-sm opacity-75">{liveLesson.topic}</p>}
              </div>
            </div>
            <Button 
              onClick={() => window.open(liveLesson.zoom_join_url, '_blank')}
              className="bg-white text-red-600 hover:bg-slate-100"
            >
              Join Live Class
            </Button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="h-5 w-5 text-slate-400" />
            <span className="text-2xl font-bold text-slate-900">{enrolledUnits}</span>
          </div>
          <p className="text-sm text-slate-600">Enrolled Units</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-5 w-5 text-slate-400" />
            <span className="text-2xl font-bold text-slate-900">{upcomingLessons}</span>
          </div>
          <p className="text-sm text-slate-600">Upcoming Classes</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-slate-400" />
            <span className="text-2xl font-bold text-slate-900">{thisWeekLessons}</span>
          </div>
          <p className="text-sm text-slate-600">Classes This Week</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-slate-400" />
            <span className="text-2xl font-bold text-slate-900">{completedLessons}</span>
          </div>
          <p className="text-sm text-slate-600">Completed Classes</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search your units or classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={searchQuery ? "No matching units found" : "No units enrolled yet"}
          description={searchQuery 
            ? "Try adjusting your search terms."
            : "You currently don't have any enrolled units. Please contact the college administration if you believe this is incorrect."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map(({ course, activities: courseActivities }) => {
            const courseLessons = lessonsByCourse[course.id]?.lessons || [];
            const upcomingLesson = courseLessons.find(lesson => {
              const scheduledDate = new Date(lesson.scheduled_date);
              const [startHours, startMinutes] = lesson.start_time.split(':').map(Number);
              const startTime = new Date(scheduledDate);
              startTime.setHours(startHours, startMinutes, 0, 0);
              return new Date() < startTime && lesson.status !== 'cancelled';
            });
            
            return (
              <div key={course.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{course.name}</h3>
                    <p className="text-sm text-slate-600">{course.code}</p>
                  </div>
                  <BookOpen className="h-5 w-5 text-slate-400" />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Online Lessons</span>
                    <Badge variant="outline">{courseLessons.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Upcoming</span>
                    <Badge variant="outline">
                      {courseLessons.filter(l => l.status === 'scheduled').length}
                    </Badge>
                  </div>
                </div>

                {upcomingLesson && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">Next Class</span>
                    </div>
                    <p className="text-sm text-slate-600">{upcomingLesson.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(upcomingLesson.scheduled_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short'
                        })} • {upcomingLesson.start_time}
                      </span>
                    </div>
                  </div>
                )}

                <Link href={`/student/lms/my-learning/units/${course.id}`}>
                  <Button className="w-full" size="sm">
                    View Unit
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
