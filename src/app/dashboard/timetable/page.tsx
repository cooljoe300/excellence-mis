import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { TimetableGridWrapper } from '@/components/timetable/timetable-grid-wrapper';
import { LecturerManagement } from '@/components/timetable/lecturer-management';
import { LecturerWorkload } from '@/components/timetable/lecturer-workload';
import { LecturerMyTimetable } from '@/components/timetable/lecturer-my-timetable';
import { getTimetableStats, getTimetables, getTimetableFormData, getLecturers, updateLecturer, toggleLecturerCanTeach, getLecturerWorkload } from '@/app/actions/timetable';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Timer,
  Users,
  Settings,
  Users as UsersIcon,
} from 'lucide-react';

export default async function TimetableDashboardPage() {
  const stats = await getTimetableStats();
  const timetables = await getTimetables();
  const formData = await getTimetableFormData();
  const lecturers = await getLecturers();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user role from profiles
  let userRole = null;
  let userCanTeach = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, can_teach')
      .eq('id', user.id)
      .single();
    userRole = profile?.role;
    userCanTeach = profile?.can_teach || false;
  }

  const canManageTimeSlots = userRole && ['superadmin', 'admin', 'staff'].includes(userRole);
  const canManageLecturers = userRole && ['superadmin', 'admin'].includes(userRole);
  const isLecturer = userCanTeach;

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Timetables" value={stats.totalTimetables} icon={Calendar} />
        <StatCard title="Active Timetables" value={stats.activeTimetables} icon={Timer} />
        <StatCard title="Time Slots" value={stats.totalTimeSlots} icon={Clock} />
        <StatCard title="Today's Classes" value={stats.todayClasses} icon={Users} />
      </div>

      <TimetableGridWrapper
        timetables={timetables}
        programs={formData.programs}
        timeSlots={formData.timeSlots}
        courses={formData.courses}
        lecturers={formData.lecturers}
        intakes={formData.intakes}
        rooms={formData.rooms}
      />

      {canManageLecturers && (
        <LecturerManagement
          lecturers={lecturers}
          onUpdateLecturer={updateLecturer}
          onToggleCanTeach={toggleLecturerCanTeach}
        />
      )}

      <LecturerWorkload
        lecturers={lecturers}
        onGetWorkload={getLecturerWorkload}
      />

      {isLecturer && <LecturerMyTimetable />}
    </div>
  );
}
