import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { DataTable } from '@/components/ui/page-header';
import { getTimetableStats, getTimetables } from '@/app/actions/timetable';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Building2,
  Timer,
  Users,
  MapPin,
  User,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function TimetableDashboardPage() {
  const [stats, timetables] = await Promise.all([
    getTimetableStats(),
    getTimetables(),
  ]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = timetables.filter(t => t.day === today);

  return (
    <div>
      <PageHeader
        title="Timetable Management"
        description="Manage class schedules, rooms, and teaching assignments"
        action={
          <Link href="/dashboard/timetable/new">
            <Button>+ Add Timetable Entry</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Timetables" value={stats.totalTimetables} icon={Calendar} />
        <StatCard title="Active Timetables" value={stats.activeTimetables} icon={Timer} />
        <StatCard title="Total Rooms" value={stats.totalRooms} icon={Building2} />
        <StatCard title="Time Slots" value={stats.totalTimeSlots} icon={Clock} />
        <StatCard title="Today's Classes" value={stats.todayClasses} icon={Users} />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Today's Schedule ({today})</h2>
        {todayClasses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">No classes scheduled for today</p>
          </div>
        ) : (
          <DataTable>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Course</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Lecturer</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Room</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayClasses.map((timetable) => (
                  <tr key={timetable.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {timetable.start_time} - {timetable.end_time}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{timetable.course?.code}</p>
                        <p className="text-xs text-slate-500">{timetable.course?.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{timetable.lecturer?.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {timetable.room?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={timetable.status}>{timetable.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Timetable Entries</h2>
        {timetables.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">No timetable entries yet</p>
            <Link href="/dashboard/timetable/new" className="mt-4 inline-block">
              <Button>+ Add First Entry</Button>
            </Link>
          </div>
        ) : (
          <DataTable>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Course</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Day</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Lecturer</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Room</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timetables.map((timetable) => (
                  <tr key={timetable.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{timetable.course?.code}</p>
                        <p className="text-xs text-slate-500">{timetable.course?.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{timetable.day}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {timetable.start_time} - {timetable.end_time}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{timetable.lecturer?.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.room?.name}</td>
                    <td className="px-4 py-3">
                      <Badge status={timetable.status}>{timetable.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/dashboard/timetable/rooms">
          <Button variant="secondary">Manage Rooms</Button>
        </Link>
        <Link href="/dashboard/timetable/time-slots">
          <Button variant="secondary">Manage Time Slots</Button>
        </Link>
      </div>
    </div>
  );
}
