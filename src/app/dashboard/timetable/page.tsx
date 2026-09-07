import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { TimetableGridWrapper } from '@/components/timetable/timetable-grid-wrapper';
import { getTimetableStats, getTimetables, getTimetableFormData } from '@/app/actions/timetable';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Building2,
  Timer,
  Users,
  Settings,
} from 'lucide-react';

export default async function TimetableDashboardPage() {
  const stats = await getTimetableStats();
  const timetables = await getTimetables();
  const formData = await getTimetableFormData();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user role from profiles
  let userRole = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = profile?.role;
  }

  const canManageTimeSlots = userRole && ['superadmin', 'admin', 'staff'].includes(userRole);

  return (
    <div>
      <PageHeader
        title="Timetable Management"
        description="Manage class schedules, rooms, and teaching assignments"
        action={canManageTimeSlots ? (
          <Link href="/dashboard/timetable/time-slots">
            <Button variant="secondary">
              <Settings className="h-4 w-4 mr-2" />
              Manage Time Slots
            </Button>
          </Link>
        ) : undefined}
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
