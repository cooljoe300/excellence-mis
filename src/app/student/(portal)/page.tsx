import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getMyEnrollmentsWithFees } from '@/app/actions/student-enrollment';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataRow } from '@/components/ui/data-row';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCurrency, getAdmissionNumber } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, UserPlus, BookOpen, CreditCard } from 'lucide-react';
import { InstallAppCard } from '@/components/student/install-app-card';

export default async function StudentPortalPage() {
  const student = await getMyStudentRecord();

  if (!student) {
    redirect('/student/register');
  }

  const enrollmentData = await getMyEnrollmentsWithFees();
  const admissionNumber = getAdmissionNumber(student);
  const lmsSynced = student.lms_sync_status === 'synced';
  const lmsFailed = student.lms_sync_status === 'failed';
  const fees = enrollmentData?.fees ?? [];
  const totalDue = fees.reduce(
    (sum, fee) => sum + Math.max(0, Number(fee.amount) - Number(fee.amount_paid)),
    0
  );

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

      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <InstallAppCard />
      </Suspense>

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
              ? student.photo_url
                ? `Ready — ${formatDate(student.id_card_issued_at)}`
                : 'Add passport photo in My Details'
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

      <div className="mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-700" />
              My Units
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Link href="/student/deregister">
                <Button size="sm" variant="secondary">
                  Request deregistration
                </Button>
              </Link>
              <Link href="/student/enroll">
                <Button size="sm">Register units</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(enrollmentData?.enrollments.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-600">
                You have not registered any units yet.{' '}
                <Link href="/student/enroll" className="text-blue-700 hover:underline">
                  Register units now
                </Link>
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {enrollmentData?.enrollments.map((e) => {
                  const course = e.course as { code: string; name: string; unit_fee: number } | null;
                  return (
                    <div key={e.id} className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
                      <span className="text-slate-700">
                        {course?.code} — {course?.name}
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(course?.unit_fee ?? 0)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between pt-2 font-semibold text-slate-900">
                  <span>Units total</span>
                  <span className="text-blue-700">
                    {formatCurrency(
                      enrollmentData?.enrollments.reduce(
                        (sum, e) =>
                          sum + Number((e.course as { unit_fee?: number } | null)?.unit_fee ?? 0),
                        0
                      ) ?? 0
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card className={totalDue > 0 ? 'border-amber-200 bg-amber-50/30' : undefined}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-700" />
              Fees & Balance
            </CardTitle>
            <Link href="/student/fees">
              <Button size="sm">{totalDue > 0 ? 'Pay fees' : 'View fees'}</Button>
            </Link>
          </CardHeader>
          <CardContent className="text-sm">
            {fees.length === 0 ? (
              <p className="text-slate-600">No fee invoices yet.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Outstanding balance</span>
                  <span className="font-bold text-blue-700">{formatCurrency(totalDue)}</span>
                </div>
                {totalDue > 0 && (
                  <p className="text-amber-800">Partial payments accepted — pay what you can today.</p>
                )}
                {totalDue <= 0 && (
                  <p className="text-emerald-700">All fees paid in full.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DataRow label="Name" value={`${student.first_name} ${student.last_name}`} />
            <DataRow label="Email" value={student.email} />
            <DataRow label="Phone" value={student.phone} />
            <DataRow label="Date of birth" value={formatDate(student.date_of_birth)} />
            <DataRow label="Gender" value={student.gender} />
            <DataRow label="Nationality" value={student.nationality} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DataRow label="Program" value={(student.program as { name: string } | null)?.name} />
            <DataRow label="Enrollment date" value={formatDate(student.enrollment_date)} />
            <DataRow label="Status" value={student.status} />
            {lmsSynced && (
              <>
                <DataRow label="LMS username" value={student.lms_username} />
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

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/student/enroll">
          <Button>Register units</Button>
        </Link>
        <Link href="/student/fees">
          <Button variant={totalDue > 0 ? undefined : 'secondary'}>Pay fees</Button>
        </Link>
        <Link href="/student/id-card" target="_blank">
          <Button variant="secondary">View ID card</Button>
        </Link>
        <Link href="/student/register">
          <Button variant="secondary">Update my details</Button>
        </Link>
        <Link href="/student/admission-letter">
          <Button variant="secondary">Admission Letter</Button>
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
