'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { getLearningActivitiesByCourse } from '@/app/actions/lms';
import type { Program, Course } from '@/lib/types';
import { ArrowLeft, BookOpen, Video } from 'lucide-react';

export function LmsProgrammeUnitsClient({ 
  program, 
  courses 
}: { 
  program: Program; 
  courses: Course[] 
}) {
  return (
    <div>
      <PageHeader
        title={`${program.name} - Courses`}
        description="Manage learning activities for courses in this programme"
        action={
          <Link href="/dashboard/lms/programmes">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Programmes
            </Button>
          </Link>
        }
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses in this programme"
          description="Courses need to be added to this programme before learning activities can be managed."
        />
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">S/N</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course, index) => (
                <CourseRow key={course.id} course={course} serialNumber={index + 1} />
              ))}
            </TableBody>
          </Table>
        </DataTable>
      )}
    </div>
  );
}

function CourseRow({ course, serialNumber }: { course: Course; serialNumber: number }) {
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityCount, setActivityCount] = useState<number | null>(null);

  async function loadActivityCount() {
    if (activityCount !== null) return;
    
    setLoadingActivities(true);
    try {
      const activities = await getLearningActivitiesByCourse(course.id);
      setActivityCount(activities.length);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="text-slate-600">{serialNumber}</TableCell>
      <TableCell className="font-mono text-xs font-medium">{course.code}</TableCell>
      <TableCell className="font-medium text-slate-900">{course.name}</TableCell>
      <TableCell className="text-muted">{course.credits}</TableCell>
      <TableCell>
        <Badge status={course.is_active ? 'active' : 'inactive'}>
          {course.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Link 
          href={`/dashboard/lms/programmes/${course.program_id}/units/${course.id}`}
          onMouseEnter={loadActivityCount}
        >
          <Button size="sm" variant="secondary">
            <Video className="h-4 w-4 mr-2" />
            {loadingActivities ? 'Loading...' : activityCount !== null ? `${activityCount} Activities` : 'Manage Activities'}
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}
