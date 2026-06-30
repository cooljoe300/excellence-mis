'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  cancelMyDeregistrationRequest,
  submitMyDeregistrationRequest,
  type EnrolledUnitForDeregistration,
} from '@/app/actions/student-deregistration';
import type { Student, StudentDeregistrationRequest } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertTriangle, BookOpen, ClipboardList } from 'lucide-react';

export function StudentDeregistrationForm({
  student,
  enrolledUnits,
  requests,
  setupRequired,
}: {
  student: Student;
  enrolledUnits: EnrolledUnitForDeregistration[];
  requests: StudentDeregistrationRequest[];
  setupRequired?: boolean;
}) {
  const router = useRouter();
  const [requestType, setRequestType] = useState<'units' | 'full_withdrawal'>('units');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pendingRequest = requests.find((r) => r.status === 'pending');
  const deregisterableUnits = enrolledUnits.filter((u) => !u.hasGrades);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedTotal = useMemo(
    () =>
      deregisterableUnits
        .filter((u) => selectedSet.has(u.courseId))
        .reduce((sum, u) => sum + u.unitFee, 0),
    [deregisterableUnits, selectedSet]
  );

  function toggleUnit(courseId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(courseId);
      else next.delete(courseId);
      return Array.from(next);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await submitMyDeregistrationRequest({
      requestType,
      courseIds: requestType === 'units' ? selectedIds : [],
      reason,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(
      result.requestType === 'full_withdrawal'
        ? 'Your request to withdraw from the college has been submitted for admin review.'
        : 'Your unit deregistration request has been submitted for admin review.'
    );
    setReason('');
    setSelectedIds([]);
    setLoading(false);
    router.refresh();
  }

  async function handleCancel(requestId: string) {
    setLoading(true);
    setError(null);
    const result = await cancelMyDeregistrationRequest(requestId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setSuccess('Your pending request was cancelled.');
    setLoading(false);
    router.refresh();
  }

  if (setupRequired) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Deregistration requests are not available yet. Ask the college to run migration{' '}
        <code className="rounded bg-amber-100 px-1">017_student_deregistration_requests.sql</code>{' '}
        in Supabase.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>
      )}

      {pendingRequest ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <ClipboardList className="h-5 w-5" />
              Pending request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-950">
            <p>
              You have a{' '}
              <strong>
                {pendingRequest.request_type === 'full_withdrawal'
                  ? 'full withdrawal'
                  : 'unit deregistration'}
              </strong>{' '}
              request waiting for admin approval.
            </p>
            <p className="text-amber-900">{pendingRequest.reason}</p>
            <p className="text-xs text-amber-800">Submitted {formatDate(pendingRequest.created_at)}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => handleCancel(pendingRequest.id)}
            >
              Cancel request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-700" />
                What would you like to request?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="radio"
                  name="requestType"
                  className="mt-1"
                  checked={requestType === 'units'}
                  onChange={() => setRequestType('units')}
                />
                <div>
                  <p className="font-medium text-slate-900">Deregister selected units</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Remove one or more units from your current registration. Unpaid fees for those
                    units will be adjusted after approval.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="radio"
                  name="requestType"
                  className="mt-1"
                  checked={requestType === 'full_withdrawal'}
                  onChange={() => setRequestType('full_withdrawal')}
                />
                <div>
                  <p className="font-medium text-slate-900">Withdraw from the college</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Request to leave Excellence Online College. All open units will be dropped and
                    your account will be marked withdrawn if approved.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {requestType === 'units' && (
            <Card>
              <CardHeader>
                <CardTitle>Select units to deregister</CardTitle>
              </CardHeader>
              <CardContent>
                {deregisterableUnits.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    You have no units that can be deregistered this term.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {enrolledUnits.map((unit) => {
                      const disabled = unit.hasGrades;
                      const checked = selectedSet.has(unit.courseId);
                      return (
                        <label
                          key={unit.courseId}
                          className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                            disabled
                              ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
                              : 'cursor-pointer border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => toggleUnit(unit.courseId, e.target.checked)}
                            />
                            <div>
                              <p className="font-medium text-slate-900">
                                {unit.code} — {unit.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {unit.credits} credits
                                {disabled && ' · grades recorded — contact admin'}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(unit.unitFee)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {requestType === 'units' && selectedIds.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/40">
              <CardContent className="py-4 text-sm">
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Selected unit fees (if approved, balance may be reduced)</span>
                  <span className="text-blue-700">{formatCurrency(selectedTotal)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Reason for request</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explain why you want to deregister (minimum 10 characters)..."
                required
              />
            </CardContent>
          </Card>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Requests are reviewed by college administration. Fees already paid are kept on
                record. Unpaid balances for deregistered units are adjusted after approval.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={
                loading ||
                (requestType === 'units' &&
                  (selectedIds.length === 0 || deregisterableUnits.length === 0)) ||
                (requestType === 'full_withdrawal' && enrolledUnits.length === 0)
              }
            >
              {loading ? 'Submitting...' : 'Submit request'}
            </Button>
            <Link href="/student/enroll">
              <Button type="button" variant="secondary">
                Back to units
              </Button>
            </Link>
          </div>
        </form>
      )}

      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">
                    {request.request_type === 'full_withdrawal'
                      ? 'Full withdrawal'
                      : `Deregister ${request.course_ids.length} unit${
                          request.course_ids.length === 1 ? '' : 's'
                        }`}
                  </p>
                  <Badge status={request.status}>{request.status}</Badge>
                </div>
                <p className="mt-1 text-slate-600">{request.reason}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted {formatDate(request.created_at)}
                  {(request.term as { name: string } | null)?.name
                    ? ` · ${(request.term as { name: string }).name}`
                    : ''}
                </p>
                {request.review_notes && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                    Admin response: {request.review_notes}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {student.status !== 'active' && (
        <p className="text-sm text-slate-500">
          Your account status is <strong>{student.status}</strong>. New requests may not be available.
        </p>
      )}
    </div>
  );
}
