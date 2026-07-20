import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { TimetableGridWrapper } from '@/components/timetable/timetable-grid-wrapper';
import { getTimetableStats, getTimetables, getTimetableFormData } from '@/app/actions/timetable';
import {
  Calendar,
  Clock,
  Building2,
  Timer,
  Users,
} from 'lucide-react';

export default async function TimetableDashboardPage() {
  const stats = await getTimetableStats();
  const timetables = await getTimetables();
  const formData = await getTimetableFormData();

  return (
    <div>
      <PageHeader
        title="Timetable Management"
        description="Manage class schedules, rooms, and teaching assignments"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatCard title="Total Timetables" value={stats.totalTimetables} icon={Calendar} />
        <StatCard title="Active Timetables" value={stats.activeTimetables} icon={Timer} />
        <StatCard title="Total Rooms" value={stats.totalRooms} icon={Building2} />
        <StatCard title="Time Slots" value={stats.totalTimeSlots} icon={Clock} />
        <StatCard title="Today's Classes" value={stats.todayClasses} icon={Users} />
      </div>

      <TimetableGridWrapper
        timetables={timetables}
        programs={formData.programs}
        rooms={formData.rooms}
        timeSlots={formData.timeSlots}
        courses={formData.courses}
        lecturers={formData.lecturers}
        intakes={formData.intakes}
        terms={formData.terms}
      />
    </div>
  );
}
