'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { getStudentLearningActivities } from '@/app/actions/lms';
import type { Student, LmsLearningActivity } from '@/lib/types';
import { BookOpen, Video, Loader2 } from 'lucide-react';

export function StudentMyLearningClient({ student }: { student: Student }) {
  const [activities, setActivities] = useState<LmsLearningActivity[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadActivities() {
    setLoading(true);
    try {
      const data = await getStudentLearningActivities();
      setActivities(data);
    } catch (error) {
      console.error('Error loading learning activities:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
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

  return (
    <div>
      <PageHeader
        title="My Learning"
        description="Access learning activities for your enrolled courses"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No learning activities available"
          description="Learning activities will appear here once your courses have activities added."
        />
      ) : (
        <div className="space-y-6">
          {Object.values(activitiesByCourse).map(({ course, activities: courseActivities }) => (
            <div key={course.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{course.name}</h3>
                  <p className="text-sm text-slate-600">{course.code}</p>
                </div>
                <Badge variant="outline">
                  {courseActivities.length} {courseActivities.length === 1 ? 'Activity' : 'Activities'}
                </Badge>
              </div>

              <Link href={`/student/(portal)/lms/my-learning/units/${course.id}`}>
                <Button size="sm" variant="secondary">
                  <Video className="h-4 w-4 mr-2" />
                  View Activities
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
