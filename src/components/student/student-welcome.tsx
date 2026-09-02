import { Card } from '@/components/ui/card';
import { User, Calendar } from 'lucide-react';
import { getAdmissionNumber, formatDate } from '@/lib/utils';
import type { Student } from '@/lib/types';

interface StudentWelcomeProps {
  student: Student;
}

export function StudentWelcome({ student }: StudentWelcomeProps) {
  const admissionNumber = getAdmissionNumber(student);
  const now = new Date();
  const hours = now.getHours();
  let greeting = 'Good evening';
  
  if (hours < 12) greeting = 'Good morning';
  else if (hours < 18) greeting = 'Good afternoon';

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {greeting}, {student.first_name} 👋
            </h1>
            <p className="mt-1 text-slate-600">
              Welcome back to Excellence Online College.
            </p>
          </div>
          
          {student.photo_url ? (
            <div className="h-16 w-16 rounded-full bg-white border-2 border-blue-200 overflow-hidden">
              <img
                src={student.photo_url}
                alt={`${student.first_name} ${student.last_name}`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-slate-700">Admission No:</span>
            <span className="font-mono font-semibold text-blue-900">{admissionNumber}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-slate-700">Program:</span>
            <span className="font-semibold text-slate-900">
              {student.program?.name || 'Not assigned'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}