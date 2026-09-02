import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Enrollment, AcademicTerm } from '@/lib/types';
import { getStatusColor } from '@/lib/utils';

interface CurrentUnitsProps {
  enrollments: Enrollment[];
  currentTerm: AcademicTerm | null;
}

export function CurrentUnits({ enrollments, currentTerm }: CurrentUnitsProps) {
  const currentEnrollments = enrollments.filter(e => e.status === 'active' || e.status === 'pending');
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-700" />
          Current Units
        </CardTitle>
        <div className="flex gap-2">
          {currentEnrollments.length > 0 && (
            <Link href="/student/deregister">
              <Button size="sm" variant="secondary">
                Request Deregistration
              </Button>
            </Link>
          )}
          <Link href="/student/enroll">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Register Units
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {currentEnrollments.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">
              No units registered for {currentTerm?.name || 'current semester'}.
            </p>
            <Link href="/student/enroll" className="inline-block mt-4">
              <Button size="sm">Register Units Now</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {currentEnrollments.map((enrollment) => {
              const course = enrollment.course as { code: string; name: string; credits: number; unit_fee: number } | null;
              return (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{course?.code}</h4>
                      <Badge status={enrollment.status}>{enrollment.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{course?.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{course?.credits} credits</span>
                      <span>•</span>
                      <span>KSh {course?.unit_fee?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}