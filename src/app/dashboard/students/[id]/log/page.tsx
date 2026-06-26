import { notFound } from 'next/navigation';
import { getStudent } from '@/app/actions/students';
import { getEnrollmentsForStudent } from '@/app/actions/enrollments';
import { getFeePaymentsForStudent } from '@/app/actions/fees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

type LogEntry = {
  date: string;
  action: string;
  detail: string;
};

export default async function StudentLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let student;
  let enrollments;
  let fees;
  try {
    [student, enrollments, fees] = await Promise.all([
      getStudent(id),
      getEnrollmentsForStudent(id),
      getFeePaymentsForStudent(id),
    ]);
  } catch {
    notFound();
  }

  const entries: LogEntry[] = [
    {
      date: student.created_at,
      action: 'Student registered',
      detail: `Record created in MIS (${student.status})`,
    },
  ];

  if (student.id_card_issued_at) {
    entries.push({
      date: student.id_card_issued_at,
      action: 'ID card issued',
      detail: 'Student identification card generated',
    });
  }

  if (student.lms_synced_at) {
    entries.push({
      date: student.lms_synced_at,
      action: 'LMS import',
      detail: `Synced to Moodle as ${student.lms_username ?? 'user'}`,
    });
  }

  for (const enrollment of enrollments) {
    entries.push({
      date: enrollment.enrolled_at,
      action: 'Unit enrolled',
      detail: `${(enrollment.course as { code: string }).code} — ${(enrollment.term as { name: string }).name}`,
    });
  }

  for (const fee of fees) {
    entries.push({
      date: fee.created_at,
      action: 'Fee invoice',
      detail: fee.description ?? `KES ${fee.amount}`,
    });
    if (fee.paid_date) {
      entries.push({
        date: fee.paid_date,
        action: 'Payment recorded',
        detail: `${fee.payment_method ?? 'Payment'} — KES ${fee.amount_paid}`,
      });
    }
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student activity log</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0 divide-y divide-slate-100">
            {entries.map((entry, index) => (
              <div key={`${entry.date}-${index}`} className="flex gap-4 py-3 text-sm">
                <p className="w-36 shrink-0 text-slate-500">{formatDate(entry.date)}</p>
                <div>
                  <p className="font-medium text-slate-900">{entry.action}</p>
                  <p className="text-slate-600">{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
