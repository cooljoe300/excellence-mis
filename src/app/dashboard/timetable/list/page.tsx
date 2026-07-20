import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/page-header';
import { getTimetables } from '@/app/actions/timetable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Edit,
  Trash2,
  Copy,
  Download,
  Printer,
  Filter,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default async function TimetableListPage() {
  const timetables = await getTimetables();

  return (
    <div>
      <PageHeader
        title="Timetable List"
        description="View and manage all scheduled classes"
        action={
          <Link href="/dashboard/timetable/new">
            <Button>+ Add Timetable Entry</Button>
          </Link>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search timetables..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="secondary" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="secondary" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <DataTable>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Course</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Unit Code</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Unit Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Programme</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Semester</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Lecturer</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Room</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Day</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Start Time</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">End Time</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {timetables.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    No timetable entries found
                  </td>
                </tr>
              ) : (
                timetables.map((timetable) => (
                  <tr key={timetable.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{timetable.course?.code || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{timetable.course?.code || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.course?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.program?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.semester || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.lecturer?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.room?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.day}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.start_time}</td>
                    <td className="px-4 py-3 text-slate-600">{timetable.end_time}</td>
                    <td className="px-4 py-3">
                      <Badge status={timetable.status}>{timetable.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/timetable/${timetable.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Duplicate">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTable>

      {timetables.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <p>Showing {timetables.length} entries</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled>
              Previous
            </Button>
            <span>Page 1 of 1</span>
            <Button variant="secondary" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
