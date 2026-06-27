import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentWorkflow } from '@/components/students/student-workflow';
import { formatDate, formatCurrency, getAdmissionNumber } from '@/lib/utils';
import type { Student } from '@/lib/types';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value || '—'}</span>
    </div>
  );
}

export function StudentProfileView({
  student,
  justRegistered,
  selfRegistered,
  invoiceId,
}: {
  student: Student;
  justRegistered?: boolean;
  selfRegistered?: boolean;
  invoiceId?: string | null;
}) {
  const admissionNumber = getAdmissionNumber(student);

  return (
    <>
      <StudentWorkflow
        student={student}
        justRegistered={justRegistered}
        selfRegistered={selfRegistered}
        invoiceId={invoiceId}
      />

      {selfRegistered && student.lms_sync_status !== 'synced' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This student self-registered. Review their details below, then use{' '}
          <strong>Import to LMS</strong> to create their Moodle account.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {selfRegistered && <Badge status="pending">Self-registered</Badge>}
        <Badge status={student.status}>{student.status}</Badge>
        <Badge
          status={
            student.lms_sync_status === 'synced'
              ? 'active'
              : student.lms_sync_status === 'failed'
                ? 'withdrawn'
                : 'pending'
          }
        >
          LMS:{' '}
          {student.lms_sync_status === 'synced'
            ? 'Imported'
            : student.lms_sync_status === 'failed'
              ? 'Failed'
              : 'Not imported'}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Admission number" value={admissionNumber} />
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
            <Row
              label="Intake"
              value={(student.intake as { name: string } | null)?.name}
            />
            <Row label="Enrollment date" value={formatDate(student.enrollment_date)} />
            <Row label="ID card issued" value={formatDate(student.id_card_issued_at)} />
            <Row
              label="Tuition"
              value={
                student.program
                  ? formatCurrency((student.program as { tuition_fee: number }).tuition_fee)
                  : '—'
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LMS Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="LMS username" value={student.lms_username} />
            <Row label="LMS user ID" value={student.lms_user_id} />
            <Row label="Synced at" value={formatDate(student.lms_synced_at)} />
            {student.lms_sync_error && <Row label="Last error" value={student.lms_sync_error} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={student.emergency_contact_name} />
            <Row label="Phone" value={student.emergency_contact_phone} />
            <Row label="Address" value={student.address} />
            <Row label="City" value={student.city} />
            {student.notes && <Row label="Notes" value={student.notes} />}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
