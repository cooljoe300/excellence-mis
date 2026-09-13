'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import type { FeePayment, Student } from '@/lib/types';
import { applyFeeDiscount, removeFeeDiscount } from '@/app/actions/fees';

interface FeeDiscountModalProps {
  fee: FeePayment;
  student: Student;
  onClose: () => void;
  onSuccess: () => void;
}

export function FeeDiscountModal({ fee, student, onClose, onSuccess }: FeeDiscountModalProps) {
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const originalAmount = fee.original_amount ?? fee.amount;
  const hasExistingDiscount = fee.discount_amount > 0;

  // Calculate preview
  let discountValue = 0;
  if (discountType === 'fixed') {
    discountValue = parseFloat(discountAmount) || 0;
  } else {
    discountValue = originalAmount * ((parseFloat(discountPercentage) || 0) / 100);
  }
  const adjustedAmount = originalAmount - discountValue;
  const currentBalance = Math.max(0, adjustedAmount - fee.amount_paid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRemoving) {
      const result = await removeFeeDiscount(fee.id);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    } else {
      const discAmount = discountType === 'fixed' ? parseFloat(discountAmount) : null;
      const discPercentage = discountType === 'percentage' ? parseFloat(discountPercentage) : null;

      if (!reason.trim()) {
        setError('Please provide a reason for the discount');
        setLoading(false);
        return;
      }

      if (discountValue <= 0) {
        setError('Discount amount must be greater than 0');
        setLoading(false);
        return;
      }

      if (discountValue > originalAmount) {
        setError('Discount cannot exceed original fee amount');
        setLoading(false);
        return;
      }

      const result = await applyFeeDiscount(
        fee.id,
        discountType,
        discAmount || 0,
        discPercentage,
        reason
      );

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  const handleRemoveDiscount = () => {
    setIsRemoving(true);
  };

  const handleCancelRemove = () => {
    setIsRemoving(false);
  };

  return (
    <Modal open onClose={onClose} title={hasExistingDiscount ? 'Manage Discount' : 'Apply Discount'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Student:</span>
            <span className="text-sm font-medium text-slate-900">
              {student.first_name} {student.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Admission Number:</span>
            <span className="text-sm font-mono text-slate-900">{student.admission_number || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Description:</span>
            <span className="text-sm text-slate-900">{fee.description || 'Fee payment'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Original Fee:</span>
            <span className="text-sm font-semibold text-slate-900">{formatCurrency(originalAmount)}</span>
          </div>
          {hasExistingDiscount && !isRemoving && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Current Discount:</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {formatCurrency(fee.discount_amount)}
                  {fee.discount_percentage && ` (${fee.discount_percentage}%)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Adjusted Fee:</span>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(fee.amount)}</span>
              </div>
            </>
          )}
        </div>

        {hasExistingDiscount && !isRemoving ? (
          <div className="space-y-4">
            <Alert variant="info">
              This fee already has a discount applied. You can remove it to restore the original amount.
            </Alert>
            <Button
              type="button"
              variant="danger"
              onClick={handleRemoveDiscount}
              className="w-full"
            >
              Remove Discount
            </Button>
          </div>
        ) : isRemoving ? (
          <div className="space-y-4">
            <Alert variant="warning">
              Are you sure you want to remove the discount? The fee will be restored to {formatCurrency(originalAmount)}.
            </Alert>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelRemove}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Removing...' : 'Remove Discount'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Select
              label="Discount Type"
              name="discount_type"
              options={[
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'percentage', label: 'Percentage' },
              ]}
              value={discountType}
              onChange={(value) => setDiscountType(value as 'fixed' | 'percentage')}
              required
            />

            {discountType === 'fixed' ? (
              <Input
                name="discount_amount"
                label="Discount Amount (KES)"
                type="number"
                step="0.01"
                min="0"
                max={originalAmount}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                required
              />
            ) : (
              <Input
                name="discount_percentage"
                label="Discount Percentage (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                required
              />
            )}

            <Input
              name="reason"
              label="Reason for Discount"
              placeholder="e.g., Financial assistance, early payment discount"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />

            {discountValue > 0 && (
              <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Original Fee:</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(originalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Discount:</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {formatCurrency(discountValue)}
                    {discountType === 'percentage' && ` (${parseFloat(discountPercentage).toFixed(2)}%)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Adjusted Fee:</span>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(adjustedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Amount Paid:</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(fee.amount_paid)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2">
                  <span className="text-sm font-medium text-slate-900">New Balance:</span>
                  <span className={`text-sm font-semibold ${currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
              </div>
            )}

            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading || discountValue <= 0}>
                {loading ? 'Applying...' : 'Apply Discount'}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
