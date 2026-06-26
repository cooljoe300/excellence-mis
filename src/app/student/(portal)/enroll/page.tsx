import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMyUnitEnrollmentData } from '@/app/actions/student-enrollment';
import { StudentUnitEnrollment } from '@/components/students/student-unit-enrollment';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

export default async function StudentEnrollPage() {
  const data = await getMyUnitEnrollmentData();

  if (!data) redirect('/student/signup');
  if (data.needsRegistration) redirect('/student/register');

  if (data.error && !data.programName) {
    return (
      <div>
        <PageHeader
          title="Register units"
          description="Select the course units you want to enroll in"
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          {data.error}
          <div className="mt-4">
            <Link href="/student/register">
              <Button size="sm">Go to My Details</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Register units"
        description={`Select units for ${data.programName ?? 'your program'} — each unit is billed separately`}
      />
      {data.error && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {data.error}
        </div>
      )}
      <StudentUnitEnrollment
        programName={data.programName}
        units={data.units}
        enrolledUnitIds={data.enrolledUnitIds}
        termMissing={!data.termId}
      />
    </div>
  );
}
