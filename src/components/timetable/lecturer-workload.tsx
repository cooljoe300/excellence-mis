'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Timetable, Profile } from '@/lib/types';

interface LecturerWorkloadProps {
  lecturers: Profile[];
  onGetWorkload: (lecturerId: string) => Promise<Timetable[]>;
}

export function LecturerWorkload({ lecturers, onGetWorkload }: LecturerWorkloadProps) {
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
  const [workload, setWorkload] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalHours, setTotalHours] = useState(0);

  async function handleLecturerChange(lecturerId: string) {
    setSelectedLecturerId(lecturerId);
    if (!lecturerId) {
      setWorkload([]);
      setTotalHours(0);
      return;
    }

    setLoading(true);
    const lecturerWorkload = await onGetWorkload(lecturerId);
    setWorkload(lecturerWorkload);
    
    // Calculate total hours
    const hours = lecturerWorkload.reduce((sum, tt) => {
      const start = new Date(`2000-01-01T${tt.start_time}`);
      const end = new Date(`2000-01-01T${tt.end_time}`);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    setTotalHours(hours);
    setLoading(false);
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lecturer Workload View</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="lecturer" className="text-sm font-medium text-slate-700">
            Select Lecturer
          </label>
          <Select
            id="lecturer"
            options={[
              { value: '', label: 'Select a lecturer' },
              ...lecturers.map((l) => ({ value: l.id, label: l.full_name })),
            ]}
            value={selectedLecturerId}
            onChange={(e) => handleLecturerChange(e.target.value)}
          />
        </div>

        {selectedLecturerId && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Total Classes</div>
                <div className="text-2xl font-semibold">{workload.length}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Total Hours/Week</div>
                <div className="text-2xl font-semibold">{totalHours.toFixed(1)}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Active Classes</div>
                <div className="text-2xl font-semibold">{workload.filter(w => w.status === 'active').length}</div>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-slate-500 py-8">Loading workload...</div>
            ) : workload.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No timetable entries found for this lecturer</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Intake</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workload.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.day}</TableCell>
                      <TableCell>{entry.start_time} - {entry.end_time}</TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.course?.code}</div>
                        <div className="text-sm text-slate-500">{entry.course?.name}</div>
                      </TableCell>
                      <TableCell>{entry.program?.name}</TableCell>
                      <TableCell>{entry.intake?.name}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === 'active' ? 'default' : 'secondary'}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
