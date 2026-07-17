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
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div>
      )}

      {pendingRequest ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900 text-base">
              <ClipboardList className="h-4 w-4" />
              Pending request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-950 pt-0">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-blue-700" />
                What would you like to request?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="radio"
                  name="requestType"
                  className="mt-0.5 h-4 w-4"
                  checked={requestType === 'units'}
                  onChange={() => setRequestType('units')}
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Deregister selected units</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Remove units from registration. Unpaid fees adjusted after approval.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="radio"
                  name="requestType"
                  className="mt-0.5 h-4 w-4"
                  checked={requestType === 'full_withdrawal'}
                  onChange={() => setRequestType('full_withdrawal')}
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Withdraw from the college</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Leave Excellence Online College. All units dropped if approved.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {requestType === 'units' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select units to deregister</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {deregisterableUnits.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    You have no units that can be deregistered this term.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {enrolledUnits.map((unit) => {
                      const disabled = unit.hasGrades;
                      const checked = selectedSet.has(unit.courseId);
                      return (
                        <label
                          key={unit.courseId}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                            disabled
                              ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
                              : 'cursor-pointer border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-3.5 w-3.5"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => toggleUnit(unit.courseId, e.target.checked)}
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900 leading-tight">
                                {unit.code} — {unit.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {unit.credits} credits
                                {disabled && ' · grades recorded — contact admin'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold">{formatCurrency(unit.unitFee)}</span>
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
              <CardContent className="py-2 text-sm">
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Selected unit fees (if approved, balance may be reduced)</span>
                  <span className="text-blue-700">{formatCurrency(selectedTotal)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reason for request</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why you want to deregister (minimum 10 characters)..."
                required
              />
            </CardContent>
          </Card>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Requests reviewed by admin. Paid fees kept on record. Unpaid balances adjusted after approval.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
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
              <Button type="button" variant="secondary" size="sm">
                Back to units
              </Button>
            </Link>
          </div>
        </form>
      )}

      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
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
                  <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                    Admin response: {request.review_notes}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {student.status !== 'active' && (
        <p className="text-xs text-slate-500">
          Your account status is <strong>{student.status}</strong>. New requests may not be available.
        </p>
      )}
    </div>
  );
}
