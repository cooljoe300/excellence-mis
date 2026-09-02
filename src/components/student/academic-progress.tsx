import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, BookOpen, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Enrollment } from '@/lib/types';

interface AcademicProgressProps {
  progress: {
    totalEnrollments: number;
    gradedEnrollments: number;
    averageScore: number;
    gradeDistribution: Record<string, number>;
  };
  enrollments: Enrollment[];
}

export function AcademicProgress({ progress, enrollments }: AcademicProgressProps) {
  const { totalEnrollments, gradedEnrollments, averageScore, gradeDistribution } = progress;
  const hasResults = gradedEnrollments > 0;

  const getGradeColor = (grade: string): string => {
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper === 'A' || gradeUpper === 'A+') return 'bg-emerald-100 text-emerald-800';
    if (gradeUpper === 'B' || gradeUpper === 'B+') return 'bg-blue-100 text-blue-800';
    if (gradeUpper === 'C' || gradeUpper === 'C+') return 'bg-amber-100 text-amber-800';
    if (gradeUpper === 'D') return 'bg-orange-100 text-orange-800';
    if (gradeUpper === 'F' || gradeUpper === 'E') return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-700" />
          Academic Progress
        </CardTitle>
        {hasResults && (
          <Link href="/student/exam-results">
            <Button size="sm">
              View Results
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {!hasResults ? (
          <div className="text-center py-8">
            <Award className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">
              Academic results will appear here once available.
            </p>
            {totalEnrollments > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                You have {totalEnrollments} enrolled unit{totalEnrollments !== 1 ? 's' : ''} awaiting results.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-slate-600">Graded Units</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{gradedEnrollments}</p>
                <p className="text-xs text-slate-500">of {totalEnrollments} total</p>
              </div>
              
              <div className="rounded-lg bg-white p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-slate-600">Average Score</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{averageScore.toFixed(1)}%</p>
                <p className="text-xs text-slate-500">Overall performance</p>
              </div>
              
              <div className="rounded-lg bg-white p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-slate-600">Pending</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalEnrollments - gradedEnrollments}
                </p>
                <p className="text-xs text-slate-500">Awaiting results</p>
              </div>
            </div>
            
            {Object.keys(gradeDistribution).length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-3">Grade Distribution</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(gradeDistribution).map(([grade, count]) => (
                    <Badge key={grade} className={getGradeColor(grade)}>
                      {grade}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}