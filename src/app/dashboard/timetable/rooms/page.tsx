import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/page-header';
import { getRooms } from '@/app/actions/timetable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Edit,
  Trash2,
  Plus,
  Users,
  Monitor,
  FlaskConical,
  Briefcase,
  DoorOpen,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const roomTypeIcons = {
  lecture_hall: Building2,
  computer_lab: Monitor,
  laboratory: FlaskConical,
  seminar_room: Briefcase,
  boardroom: DoorOpen,
};

const roomTypeLabels = {
  lecture_hall: 'Lecture Hall',
  computer_lab: 'Computer Lab',
  laboratory: 'Laboratory',
  seminar_room: 'Seminar Room',
  boardroom: 'Boardroom',
};

async function deleteRoom(id: string) {
  'use server';
  
  const supabase = await createClient();
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/timetable/rooms');
}

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <div>
      <PageHeader
        title="Rooms"
        description="Manage teaching rooms and their availability"
        action={
          <Link href="/dashboard/timetable/rooms/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </Link>
        }
      />

      <DataTable>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Room Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Building</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Capacity</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No rooms found. Add your first room to get started.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => {
                  const Icon = roomTypeIcons[room.type] || Building2;
                  return (
                    <tr key={room.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{room.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{room.building || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.capacity || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{roomTypeLabels[room.type] || room.type}</td>
                      <td className="px-4 py-3">
                        <Badge status={room.status === 'active' ? 'active' : 'inactive'}>
                          {room.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/timetable/rooms/${room.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <form action={deleteRoom.bind(null, room.id)}>
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
