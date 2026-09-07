import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/page-header';
import { getTimeSlots, toggleTimeSlotVisibility } from '@/app/actions/timetable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Edit,
  Trash2,
  Plus,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function deleteTimeSlot(id: string) {
  'use server';
  
  const supabase = await createClient();
  const { error } = await supabase
    .from('time_slots')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/timetable/time-slots');
}

async function handleToggleVisibility(id: string, currentVisibility: boolean) {
  'use server';
  await toggleTimeSlotVisibility(id, !currentVisibility);
}

export default async function TimeSlotsPage() {
  const timeSlots = await getTimeSlots();

  return (
    <div>
      <PageHeader
        title="Time Slots"
        description="Manage reusable teaching periods for scheduling"
        action={
          <Link href="/dashboard/timetable/time-slots/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Time Slot
            </Button>
          </Link>
        }
      />

      <DataTable>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Start Time</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">End Time</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Visibility</th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {timeSlots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No time slots found. Add your first time slot to get started.
                  </td>
                </tr>
              ) : (
                timeSlots.map((slot) => {
                  const startTime = new Date(`2000-01-01T${slot.start_time}`);
                  const endTime = new Date(`2000-01-01T${slot.end_time}`);
                  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
                  const isVisible = slot.is_visible !== false; // Default to true if undefined

                  return (
                    <tr key={slot.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{slot.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{slot.start_time}</td>
                      <td className="px-4 py-3 text-slate-600">{slot.end_time}</td>
                      <td className="px-4 py-3 text-slate-600">{duration}h</td>
                      <td className="px-4 py-3">
                        <Badge status={slot.is_active ? 'active' : 'inactive'}>
                          {slot.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <form action={handleToggleVisibility.bind(null, slot.id, isVisible)}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0" 
                            title={isVisible ? 'Visible on timetable' : 'Hidden from timetable'}
                            type="submit"
                          >
                            {isVisible ? (
                              <Eye className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </Button>
                        </form>
                        <span className="ml-2 text-xs text-slate-600">
                          {isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/timetable/time-slots/${slot.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <form action={deleteTimeSlot.bind(null, slot.id)}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" title="Delete" type="submit">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DataTable>
    </div>
  );
}
