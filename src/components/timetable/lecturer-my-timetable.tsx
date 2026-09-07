'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { Timetable } from '@/lib/types';
import { Calendar, Clock, User } from 'lucide-react';

export function LecturerMyTimetable() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    async function loadMyTimetable() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('can_teach')
          .eq('id', user.id)
          .single();

        if (!profile?.can_teach) {
          setError('You do not have lecturer capability enabled.');
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('timetables')
          .select('*, program:programs(*), course:courses(*), intake:intakes(*)')
          .eq('lecturer_id', user.id)
          .eq('status', 'active')
          .order('day', { ascending: true })
          .order('start_time', { ascending: true });

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setTimetables(data || []);
          
          // Calculate total hours
          const hours = (data || []).reduce((sum, tt) => {
            const start = new Date(`2000-01-01T${tt.start_time}`);
            const end = new Date(`2000-01-01T${tt.end_time}`);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          }, 0);
          setTotalHours(hours);
        }
      } catch (err) {
        setError('Failed to load your timetable');
      } finally {
        setLoading(false);
      }
    }

    loadMyTimetable();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 py-8">Loading your timetable...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Timetable</CardTitle>
          <div className="flex gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{timetables.length} classes</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{totalHours.toFixed(1)} hours/week</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {timetables.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            No timetable entries assigned to you yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Intake</TableHead>
                <TableHead>Online Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timetables.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.day}</TableCell>
                  <TableCell>{entry.start_time} - {entry.end_time}</TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.course?.code}</div>
                    <div className="text-sm text-slate-500">{entry.course?.name}</div>
                  </TableCell>
                  <TableCell>{entry.program?.name}</TableCell>
                  <TableCell>{entry.intake?.name}</TableCell>
                  <TableCell>
                    {entry.meeting_link ? (
                      <a
                        href={entry.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Join Class
                      </a>
                    ) : (
                      <span className="text-slate-400">No link</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
