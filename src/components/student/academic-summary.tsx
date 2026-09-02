import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataRow } from '@/components/ui/data-row';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Calendar, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Student, AcademicTerm } from '@/lib/types';

interface AcademicSummaryProps {
  student: Student;
  currentTerm: AcademicTerm | null;
}

export function AcademicSummary({ student, currentTerm }: AcademicSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-700" />
          Academic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DataRow 
          label="Programme" 
          value={student.program?.name || 'Not assigned'} 
        />
        <DataRow 
          label="Intake" 
          value={student.intake?.name || 'Not assigned'} 
        />
        <DataRow 
          label="Academic Year" 
          value={currentTerm ? getAcademicYear(currentTerm) : 'Not assigned'} 
        />
        <DataRow 
          label="Semester" 
          value={currentTerm?.name || 'Not assigned'} 
        />
        <DataRow 
          label="Enrollment Status" 
          value={
            <Badge status={student.status}>{student.status}</Badge>
          } 
        />
        <DataRow 
          label="Enrollment Date" 
          value={formatDate(student.enrollment_date)} 
        />
      </CardContent>
    </Card>
  );
}

function getAcademicYear(term: AcademicTerm): string {
  const startDate = new Date(term.start_date);
  const endDate = new Date(term.end_date);
  
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  if (startYear === endYear) {
    return startYear.toString();
  }
  
  return `${startYear}/${endYear}`;
}