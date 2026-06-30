'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import {
  approveDeregistrationRequest,
  rejectDeregistrationRequest,
} from '@/app/actions/student-deregistration';
import type { Student, StudentDeregistrationRequest } from '@/lib/types';
import { formatDate, getAdmissionNumber } from '@/lib/utils';
import { UserMinus } from 'lucide-react';

export function DeregistrationRequestsPanel({
  requests,
  courseMap,
}: {
  requests: StudentDeregistrationRequest[];
  courseMap: Record<string, { code: string; name: string }>;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  if (requests.length === 0) return null;

  async function handleApprove(requestId: string) {
    setLoadingId(requestId);
    const result = await approveDeregistrationRequest(requestId);
    if (result.error) {
      toastError(result.error);
      setLoadingId(null);
      return;
    }
    success('Deregistration request approved');
    setLoadingId(null);
    router.refresh();
  }

  async function handleReject(requestId: string) {
    setLoadingId(requestId);
    const result = await rejectDeregistrationRequest(requestId, rejectNotes);
    if (result.error) {
      toastError(result.error);
      setLoadingId(null);
      return;
    }
    success('Deregistration request rejected');
    setRejectingId(null);
    setRejectNotes('');
    setLoadingId(null);
    router.refresh();
  }

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <UserMinus className="h-5 w-5" />
          Pending deregistration requests ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => {
          const student = request.student as Student;
          const admissionNumber = student ? getAdmissionNumber(student) : '—';
          const courseIds = request.course_ids ?? [];

          return (
            <div key={request.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {student?.first_name} {student?.last_name}{' '}
                    <span className="font-mono text-sm text-slate-500">({admissionNumber})</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {(student?.program as { name: string } | null)?.name ?? 'No programme'} ·{' '}
                    {(request.term as { name: string } | null)?.name ?? 'Current term'}
                  </p>
                </div>
                <Badge status={request.request_type === 'full_withdrawal' ? 'withdrawn' : 'pending'}>
                  {request.request_type === 'full_withdrawal' ? 'Full withdrawal' : 'Unit deregistration'}
                </Badge>
              </div>

              <p className="mt-3 text-sm text-slate-700">{request.reason}</p>

              {courseIds.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {courseIds.map((id) => {
                    const course = courseMap[id];
                    return (
                      <li key={id}>
                        · {course ? `${course.code} — ${course.name}` : id}
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-2 text-xs text-slate-500">
                Requested {formatDate(request.created_at)}
              </p>

              {rejectingId === request.id ? (
                <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
                  <Textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={3}
                    placeholder="Reason for rejection (required)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={loadingId === request.id}
                      onClick={() => handleReject(request.id)}
                    >
                      Confirm reject
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectNotes('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={loadingId === request.id}
                    onClick={() => handleApprove(request.id)}
                  >
                    {loadingId === request.id ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={loadingId === request.id}
                    onClick={() => setRejectingId(request.id)}
                  >
                    Reject
                  </Button>
                  {student?.id && (
                    <Link href={`/dashboard/students/${student.id}/registration`}>
                      <Button type="button" variant="secondary" size="sm">
                        View student
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
