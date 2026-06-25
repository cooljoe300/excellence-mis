import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, getAdmissionNumber } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, UserPlus } from 'lucide-react';

export default async function StudentPortalPage() {
  const student = await getMyStudentRecord();

  if (!student) {
    redirect('/student/register');
  }

  const admissionNumber = getAdmissionNumber(student);
  const lmsSynced = student.lms_sync_status === 'synced';
  const lmsFailed = student.lms_sync_status === 'failed';

  return (
    <div>
      <PageHeader
        title={`Welcome, ${student.first_name}!`}
        description="Your student registration and LMS status"
      />

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
        <p className="text-sm font-medium text-blue-800">Your Admission Number</p>
        <p className="mt-1 font-mono text-3xl font-bold text-blue-900">{admissionNumber}</p>
        <p className="mt-2 text-sm text-blue-700">
          Keep this number — you will need it for your ID card and LMS access.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatusStep
          done
          icon={UserPlus}
          title="Registered in MIS"
          description="Your details are on file"
        />
        <StatusStep
          done={!!student.id_card_issued_at}
          icon={CheckCircle2}
          title="ID Card"
          description={
            student.id_card_issued_at
              ? `Issued ${formatDate(student.id_card_issued_at)}`
              : 'Pending admin review'
          }
        />
        <StatusStep
          done={lmsSynced}
          failed={lmsFailed}
          icon={lmsSynced ? CheckCircle2 : lmsFailed ? AlertCircle : Clock}
          title="LMS Account"
          description={
            lmsSynced
              ? `Active — ${student.lms_username}`
              : lmsFailed
                ? 'Import failed — contact admin'
                : 'Waiting for admin to push to LMS'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={`${student.first_name} ${student.last_name}`} />
            <Row label="Email" value={student.email} />
            <Row label="Phone" value={student.phone} />
            <Row label="Date of birth" value={formatDate(student.date_of_birth)} />
            <Row label="Gender" value={student.gender} />
            <Row label="Nationality" value={student.nationality} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Program" value={(student.program as { name: string } | null)?.name} />
            <Row label="Enrollment date" value={formatDate(student.enrollment_date)} />
            <Row label="Status" value={student.status} />
            {lmsSynced && (
              <>
                <Row label="LMS username" value={student.lms_username} />
                <div className="pt-2">
                  <a
                    href="https://lms.excellenceonlinecollege.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm">Go to LMS</Button>
                  </a>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Link href="/student/register">
          <Button variant="secondary">Update my details</Button>
        </Link>
      </div>
    </div>
  );
}

function StatusStep({
  done,
  failed,
  icon: Icon,
  title,
  description,
}: {
  done: boolean;
  failed?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        done
          ? 'border-emerald-200 bg-emerald-50/50'
          : failed
            ? 'border-red-200 bg-red-50/50'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-5 w-5 ${
            done ? 'text-emerald-600' : failed ? 'text-red-600' : 'text-slate-400'
          }`}
        />
        <p className="font-medium text-slate-900">{title}</p>
      </div>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      {done && !failed && (
        <Badge status="active" className="mt-2">
          Complete
        </Badge>
      )}
      {failed && (
        <Badge status="withdrawn" className="mt-2">
          Failed
        </Badge>
      )}
      {!done && !failed && (
        <Badge status="pending" className="mt-2">
          Pending
        </Badge>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value || '—'}</span>
    </div>
  );
}
