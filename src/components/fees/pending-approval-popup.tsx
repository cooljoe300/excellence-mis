'use client';

import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getPendingFeePaymentSubmissions } from '@/app/actions/fees';
import type { FeePaymentSubmission, Student, FeePayment } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

type PendingApprovalData = {
  submission: FeePaymentSubmission;
  student: Student;
  fee: FeePayment;
};

export function PendingApprovalPopup({ pendingCount }: { pendingCount: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalData[]>([]);
  const router = useRouter();

  // Show popup when there are pending approvals and it hasn't been shown yet
  useEffect(() => {
    if (pendingCount > 0 && !hasShown) {
      // Small delay to not interrupt immediately on page load
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasShown(true);
        loadPendingApprovals();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pendingCount, hasShown]);

  const loadPendingApprovals = async () => {
    setLoading(true);
    try {
      const data = await getPendingFeePaymentSubmissions();
      const pendingData = data.map((row: any) => {
        const submission = row as FeePaymentSubmission;
        const fee = (row.fee_payment ?? {}) as FeePayment;
        const student = (row.student ?? fee.student ?? {}) as Student;
        return { submission, fee, student };
      });
      setPendingApprovals(pendingData);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = () => {
    setIsOpen(false);
    router.push('/dashboard/fees');
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      title="Pending Fee Approvals"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <Bell className="h-6 w-6 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">
              {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700">
              Student payment{pendingCount !== 1 ? 's' : ''} waiting for review
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : pendingApprovals.length > 0 ? (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {pendingApprovals.map(({ submission, student, fee }) => (
              <div
                key={submission.id}
                className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {student?.first_name} {student?.last_name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {student?.admission_number || 'N/A'}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="text-slate-600">
                        {formatCurrency(submission.amount)}
                      </span>
                      <span className="text-slate-500">
                        {formatDate(submission.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Pending</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm text-slate-600">No pending approvals</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            Dismiss
          </Button>
          <Button onClick={handleReview}>
            Review Approvals
          </Button>
        </div>
      </div>
    </Modal>
  );
}
