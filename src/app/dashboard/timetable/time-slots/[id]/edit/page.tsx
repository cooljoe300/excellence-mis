import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import type { TimeSlot } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export default async function EditTimeSlotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: timeSlot, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !timeSlot) {
    console.error('Error loading time slot:', error);
    redirect('/dashboard/timetable/time-slots');
  }

  async function updateTimeSlot(formData: FormData) {
    'use server';
    
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const startTime = formData.get('start_time') as string;
    const endTime = formData.get('end_time') as string;
    const isActive = formData.get('is_active') === 'true';
    const slotId = formData.get('id') as string;

    // Get current is_visible value to preserve it
    const { data: currentSlot, error: fetchError } = await supabase
      .from('time_slots')
      .select('is_visible')
      .eq('id', slotId)
      .single();

    if (fetchError) {
      console.error('Error fetching current time slot:', fetchError);
      throw new Error('Unable to load time slot data for update');
    }

    const { error } = await supabase
      .from('time_slots')
      .update({
        name,
        start_time: startTime,
        end_time: endTime,
        is_active: isActive,
        is_visible: currentSlot?.is_visible !== false,
      })
      .eq('id', slotId);

    if (error) {
      console.error('Error updating time slot:', error);
      throw new Error('Unable to update time slot. Please try again.');
    }

    revalidatePath('/dashboard/timetable/time-slots');
    revalidatePath('/dashboard/timetable');
    redirect('/dashboard/timetable/time-slots');
  }

  return (
    <div>
      <PageHeader
        title="Edit Time Slot"
        description="Update time slot details"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Time Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTimeSlot} className="space-y-6">
            <input type="hidden" name="id" value={id} />
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Name
              </label>
              <Input
                id="name"
                name="name"
                defaultValue={timeSlot.name}
                required
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="start_time" className="text-sm font-medium text-slate-700">
                  Start Time
                </label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  defaultValue={timeSlot.start_time}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="end_time" className="text-sm font-medium text-slate-700">
                  End Time
                </label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  defaultValue={timeSlot.end_time}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                defaultChecked={timeSlot.is_active}
                value="true"
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Active
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/timetable/time-slots">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit">Update Time Slot</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
