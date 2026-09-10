'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStudentLearningActivitiesByCourse } from '@/app/actions/lms';
import type { Student, Course, LmsLearningActivity } from '@/lib/types';
import { ArrowLeft, Video, ExternalLink, Loader2 } from 'lucide-react';

export function StudentUnitActivitiesClient({ 
  student, 
  course 
}: { 
  student: Student; 
  course: Course 
}) {
  const [activities, setActivities] = useState<LmsLearningActivity[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadActivities() {
    setLoading(true);
    try {
      const data = await getStudentLearningActivitiesByCourse(course.id);
      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
  }, [course.id]);

  return (
    <div>
      <PageHeader
        title={`${course.code} - ${course.name}`}
        description={`${student.first_name} ${student.last_name} • Learning Activities`}
        action={
          <Link href="/student/lms/my-learning">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Learning
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No learning activities available"
          description="No learning activities have been added to this course yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              href={`/student/lms/activities/${activity.id}`}
              className="block"
            >
              <div className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <Video className="h-5 w-5 text-slate-400" />
                  <Badge variant="outline" className="text-xs">
                    {activity.provider.replace('_', ' ')}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{activity.name}</h3>
                {activity.display_description && activity.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {activity.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge status={activity.status} className="text-xs">
                    {activity.status}
                  </Badge>
                  <Button size="sm" variant="secondary">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {activity.launch_mode === 'same_tab' ? 'Open' : 'Join'}
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
