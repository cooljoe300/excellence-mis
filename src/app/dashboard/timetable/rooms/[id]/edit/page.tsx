import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Select from '@/components/ui/select';
import { createClient } from '@/lib/supabase/server';
import type { Room } from '@/lib/types';

const ROOM_TYPES = ['lecture_hall', 'computer_lab', 'laboratory', 'seminar_room', 'boardroom'];

export default async function EditRoomPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !room) {
    redirect('/dashboard/timetable/rooms');
  }

  async function updateRoom(formData: FormData) {
    'use server';
    
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const building = formData.get('building') as string;
    const capacity = formData.get('capacity') as string;
    const type = formData.get('type') as string;
    const status = formData.get('status') as string;

    const { error } = await supabase
      .from('rooms')
      .update({
        name,
        building: building || null,
        capacity: capacity ? parseInt(capacity) : null,
        type,
        status,
      })
      .eq('id', params.id);

    if (error) {
      throw new Error(error.message);
    }

    redirect('/dashboard/timetable/rooms');
  }

  return (
    <div>
      <PageHeader
        title="Edit Room"
        description="Update room details"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Room</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateRoom} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Room Name
              </label>
              <Input
                id="name"
                name="name"
                defaultValue={room.name}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="building" className="text-sm font-medium text-slate-700">
                Building
              </label>
              <Input
                id="building"
                name="building"
                defaultValue={room.building || ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="capacity" className="text-sm font-medium text-slate-700">
                Capacity
              </label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                defaultValue={room.capacity || ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium text-slate-700">
                Room Type
              </label>
              <Select
                id="type"
                name="type"
                options={ROOM_TYPES.map((t) => ({
                  value: t,
                  label: t.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                }))}
                value={room.type}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium text-slate-700">
                Status
              </label>
              <Select
                id="status"
                name="status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'maintenance', label: 'Under Maintenance' },
                ]}
                value={room.status}
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => redirect('/dashboard/timetable/rooms')}
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
