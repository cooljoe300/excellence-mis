'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { importStudentToLms } from '@/app/actions/lms';
import { CheckCircle2, Circle, Upload, CreditCard, UserPlus, FileText } from 'lucide-react';
import type { Student } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StudentWorkflow({
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
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    username?: string;
    temporaryPassword?: string;
    error?: string;
  } | null>(null);

  const admissionNumber = student.admission_number ?? student.student_number;
  const idCardReady = !!student.id_card_issued_at;
  const lmsSynced = student.lms_sync_status === 'synced';

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    const result = await importStudentToLms(student.id);
    if (result.error) {
      setImportResult({ error: result.error });
    } else {
      setImportResult({
        username: result.username,
        temporaryPassword: result.temporaryPassword,
      });
      router.refresh();
    }
    setImporting(false);
  }

  const steps = [
    {
      id: 1,
      title: 'Register in MIS',
      description: `Admission number: ${admissionNumber}`,
      done: true,
      icon: UserPlus,
    },
    {
      id: 2,
      title: 'Fee invoice',
      description: invoiceId
        ? 'Invoice generated and available in the student portal'
        : 'No units registered — no invoice created',
      done: !!invoiceId,
      icon: FileText,
      action: invoiceId ? (
        <Link href={`/dashboard/fees/invoice/${invoiceId}`} target="_blank">
          <Button size="sm" variant="secondary">
            Download Invoice
          </Button>
        </Link>
      ) : undefined,
    },
    {
      id: 3,
      title: 'Print ID Card',
      description: idCardReady ? 'ID card auto-generated' : 'Pending',
      done: idCardReady,
      icon: CreditCard,
      action: (
        <Link href={`/dashboard/students/${student.id}/id-card`} target="_blank">
          <Button size="sm" variant="secondary">
            View / Print ID Card
          </Button>
        </Link>
      ),
    },
    {
      id: 4,
      title: 'Import to Moodle LMS',
      description: lmsSynced
        ? `Synced as ${student.lms_username}`
        : student.lms_sync_status === 'failed'
          ? student.lms_sync_error ?? 'Import failed'
          : 'Create LMS account from MIS record',
      done: lmsSynced,
      icon: Upload,
      action: !lmsSynced ? (
        <Button size="sm" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing...' : 'Import to LMS'}
        </Button>
      ) : (
        <a
          href="https://lms.excellenceonlinecollege.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-700 hover:underline"
        >
          Open LMS
        </a>
      ),
    },
  ];

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {justRegistered && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Student registered successfully. Admission number: <strong>{admissionNumber}</strong>
          {invoiceId && (
            <span className="mt-1 block">
              A fee invoice has been created and is now visible in the student portal.
            </span>
          )}
        </div>
      )}

      {selfRegistered && !justRegistered && (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Self-registered student — review details and push to LMS when ready.
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold text-slate-900">Admission Workflow</h2>

      <div className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-4 rounded-lg border p-4',
                step.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'
              )}
            >
              <div className="mt-0.5">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-slate-500" />
                  <p className="font-medium text-slate-900">
                    Step {step.id}: {step.title}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                {importResult?.error && step.id === 4 && (
                  <p className="mt-2 text-sm text-red-600">{importResult.error}</p>
                )}
                {importResult?.username && step.id === 4 && (
                  <div className="mt-3 rounded-lg bg-white border border-emerald-200 p-3 text-sm">
                    <p><strong>LMS Username:</strong> {importResult.username}</p>
                    <p><strong>Temporary Password:</strong> {importResult.temporaryPassword}</p>
                    <p className="mt-2 text-slate-500">Share these credentials with the student securely.</p>
                  </div>
                )}
              </div>
              {step.action && <div className="shrink-0">{step.action}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
