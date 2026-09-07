import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import type { TimeSlot } from '@/lib/types';

export default async function EditTimeSlotPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  
  const { data: timeSlot, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !timeSlot) {
    redirect('/dashboard/timetable/time-slots');
  }

  async function updateTimeSlot(formData: FormData) {
    'use server';
    
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const startTime = formData.get('start_time') as string;
    const endTime = formData.get('end_time') as string;
    const isActive = formData.get('is_active') === 'true';

    // Get current is_visible value to preserve it
    const { data: currentSlot } = await supabase
      .from('time_slots')
      .select('is_visible')
      .eq('id', params.id)
      .single();

    const { error } = await supabase
      .from('time_slots')
      .update({
        name,
        start_time: startTime,
        end_time: endTime,
        is_active: isActive,
        is_visible: currentSlot?.is_visible !== false,
      })
      .eq('id', params.id);

    if (error) {
      throw new Error(error.message);
    }

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
              <Button
                type="button"
                variant="secondary"
                onClick={() => redirect('/dashboard/timetable/time-slots')}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
