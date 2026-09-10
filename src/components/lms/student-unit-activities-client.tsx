'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getStudentLearningActivitiesByCourse, getStudentOnlineLessonsByCourse } from '@/app/actions/lms';
import type { Student, Course, LmsLearningActivity, OnlineLesson } from '@/lib/types';
import { ArrowLeft, Video, ExternalLink, Loader2, Calendar, Clock, User, Search, Eye, ZoomIn } from 'lucide-react';

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
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');
  const [previewLesson, setPreviewLesson] = useState<OnlineLesson | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [activitiesData, lessonsData] = await Promise.all([
        getStudentLearningActivitiesByCourse(course.id),
        getStudentOnlineLessonsByCourse(course.id)
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
  }, [course.id]);

  // Calculate lesson status dynamically
  function getLessonStatus(lesson: OnlineLesson): 'scheduled' | 'live' | 'completed' | 'cancelled' {
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

  // Filter lessons based on search and status
  const filteredLessons = onlineLessons.filter(lesson => {
    const status = getLessonStatus(lesson);
    
    // Status filter
    if (filter === 'upcoming' && status !== 'scheduled') return false;
    if (filter === 'live' && status !== 'live') return false;
    if (filter === 'completed' && status !== 'completed') return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return lesson.title.toLowerCase().includes(query) ||
             (lesson.topic && lesson.topic.toLowerCase().includes(query)) ||
             (lesson.lecturer_name && lesson.lecturer_name.toLowerCase().includes(query));
    }
    
    return true;
  });

  function getStatusBadge(status: string) {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800',
      live: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {status === 'live' ? '🔴 LIVE NOW' : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  function handleJoinZoom(lesson: OnlineLesson) {
    window.open(lesson.zoom_join_url, '_blank', 'noopener,noreferrer');
  }

  function handleCopyLink(lesson: OnlineLesson) {
    navigator.clipboard.writeText(lesson.zoom_join_url);
    // Could add toast notification here
  }

  return (
    <div>
      <PageHeader
        title={`${course.code} - ${course.name}`}
        description={`${student.first_name} ${student.last_name} • Online Classes`}
        action={
          <Link href="/student/lms/my-learning">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Learning
            </Button>
          </Link>
        }
      />

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'upcoming', 'live', 'completed'].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'secondary'}
              onClick={() => setFilter(f as any)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredLessons.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No online classes available"
          description={searchQuery 
            ? "No classes match your search criteria."
            : "No online classes have been added to this course yet."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLessons.map((lesson) => {
            const status = getLessonStatus(lesson);
            const isLive = status === 'live';
            
            return (
              <div key={lesson.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <Video className="h-5 w-5 text-slate-400" />
                  {getStatusBadge(status)}
                </div>
                
                <h3 className="font-semibold text-slate-900 mb-1">{lesson.title}</h3>
                {lesson.topic && (
                  <p className="text-sm text-slate-600 mb-3">{lesson.topic}</p>
                )}
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(lesson.scheduled_date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                    <span>{lesson.start_time} - {lesson.end_time}</span>
                  </div>
                  {lesson.lecturer_name && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="h-4 w-4" />
                      <span>{lesson.lecturer_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => setPreviewLesson(lesson)}
                    variant="secondary"
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  {isLive ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleJoinZoom(lesson)}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <ZoomIn className="h-4 w-4 mr-2" />
                      Join Live
                    </Button>
                  ) : status === 'scheduled' ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleJoinZoom(lesson)}
                      className="flex-1"
                    >
                      <ZoomIn className="h-4 w-4 mr-2" />
                      Join
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      disabled
                      className="flex-1"
                    >
                      Ended
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{previewLesson.title}</h3>
                <Button size="sm" variant="secondary" onClick={() => setPreviewLesson(null)}>
                  Close
                </Button>
              </div>

              {previewLesson.topic && (
                <div className="mb-4">
                  <h4 className="font-medium text-slate-900 mb-1">Topic</h4>
                  <p className="text-slate-600">{previewLesson.topic}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">Date</h4>
                  <p className="text-slate-600">
                    {new Date(previewLesson.scheduled_date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">Time</h4>
                  <p className="text-slate-600">
                    {previewLesson.start_time} - {previewLesson.end_time}
                    {previewLesson.duration_minutes && (
                      <span className="ml-1">({previewLesson.duration_minutes} min)</span>
                    )}
                  </p>
                </div>
              </div>

              {previewLesson.lecturer_name && (
                <div className="mb-4">
                  <h4 className="font-medium text-slate-900 mb-1">Lecturer</h4>
                  <p className="text-slate-600">{previewLesson.lecturer_name}</p>
                </div>
              )}

              {previewLesson.description && (
                <div className="mb-4">
                  <h4 className="font-medium text-slate-900 mb-1">Description</h4>
                  <p className="text-slate-600">{previewLesson.description}</p>
                </div>
              )}

              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Zoom Online Class</h4>
                <p className="text-sm text-slate-600 mb-3">
                  The class will open in Zoom. Make sure you have a stable internet connection before joining.
                </p>
                
                {previewLesson.zoom_meeting_id && (
                  <div className="mb-2">
                    <span className="text-sm text-slate-600">Meeting ID: </span>
                    <span className="font-mono">{previewLesson.zoom_meeting_id}</span>
                  </div>
                )}
                
                {previewLesson.zoom_passcode && (
                  <div className="mb-3">
                    <span className="text-sm text-slate-600">Passcode: </span>
                    <span className="font-mono">{previewLesson.zoom_passcode}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => handleCopyLink(previewLesson)}
                  className="flex-1"
                >
                  Copy Link
                </Button>
                <Button 
                  onClick={() => handleJoinZoom(previewLesson)}
                  className="flex-1"
                >
                  Join Zoom Class
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
