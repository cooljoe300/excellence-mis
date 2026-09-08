'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { Student } from '@/lib/types';
import {
  admissionNo,
  displayValue,
  intakeName,
  programName,
  studentDisplayName,
  studentEmail,
  studentPhone,
  whatsappHref,
} from '@/lib/reports/student-fields';
import { Mail, MessageCircle, Phone } from 'lucide-react';

export function StudentReportQuickView({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const phone = studentPhone(student);
  const email = studentEmail(student);
  const whatsapp = phone !== 'N/A' ? whatsappHref(phone) : '';

  return (
    <Modal open={Boolean(student)} onClose={onClose} title="Student details" size="md">
      {student && (
        <div className="space-y-4 p-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">{studentDisplayName(student)}</p>
            <p className="text-sm text-slate-500">{admissionNo(student)}</p>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Programme</dt>
              <dd className="font-medium text-slate-900">{programName(student)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Intake</dt>
              <dd className="font-medium text-slate-900">{intakeName(student)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>
                <Badge status={student.status}>{student.status}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Reg. No.</dt>
              <dd className="font-medium text-slate-900">{displayValue(student.student_number)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">
                {phone === 'N/A' ? (
                  'N/A'
                ) : (
                  <a className="text-primary hover:underline" href={`tel:${phone}`}>
                    {phone}
                  </a>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">
                {email === 'N/A' ? (
                  'N/A'
                ) : (
                  <a className="text-primary hover:underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                )}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {phone !== 'N/A' && (
              <a href={`tel:${phone}`}>
                <Button type="button" variant="secondary" size="sm">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              </a>
            )}
            {email !== 'N/A' && (
              <a href={`mailto:${email}`}>
                <Button type="button" variant="secondary" size="sm">
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary" size="sm">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </a>
            )}
            <Link href={`/dashboard/students/${student.id}`}>
              <Button type="button" size="sm">
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
