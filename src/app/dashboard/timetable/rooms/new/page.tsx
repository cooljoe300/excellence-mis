import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Select from '@/components/ui/select';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const ROOM_TYPES = ['lecture_hall', 'computer_lab', 'laboratory', 'seminar_room', 'boardroom'];

async function createRoom(formData: FormData) {
  'use server';
  
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const building = formData.get('building') as string;
  const capacity = formData.get('capacity') as string;
  const type = formData.get('type') as string;
  const status = formData.get('status') as string;

  const { error } = await supabase
    .from('rooms')
    .insert({
      name,
      building: building || null,
      capacity: capacity ? parseInt(capacity) : null,
      type,
      status,
    });

  if (error) {
    throw new Error(error.message);
  }

  redirect('/dashboard/timetable/rooms');
}

export default async function NewRoomPage() {
  return (
    <div>
      <PageHeader
        title="Add Room"
        description="Create a new teaching room"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add Room</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRoom} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Room Name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., LH-1"
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
                placeholder="e.g., Admin Block"
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
                placeholder="e.g., 100"
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
                defaultValue="lecture_hall"
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
                defaultValue="active"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/timetable/rooms">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit">Create Room</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
