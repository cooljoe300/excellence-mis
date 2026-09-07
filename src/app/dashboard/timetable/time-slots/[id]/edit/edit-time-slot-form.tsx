'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { TimeSlot } from '@/lib/types';

interface EditTimeSlotFormProps {
  timeSlot: TimeSlot;
}

export function EditTimeSlotForm({ timeSlot }: EditTimeSlotFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/dashboard/timetable/time-slots/${timeSlot.id}/edit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to update time slot');
      }

      window.location.href = '/dashboard/timetable/time-slots';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update time slot. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Time Slot</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Name
            </label>
            <Input
              id="name"
              name="name"
              defaultValue={timeSlot.name}
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="start_time" className="text-sm font-medium text-slate-700">
                Start Time
              </label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={timeSlot.start_time}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="end_time" className="text-sm font-medium text-slate-700">
                End Time
              </label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue={timeSlot.end_time}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              defaultChecked={timeSlot.is_active}
              value="true"
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.location.href = '/dashboard/timetable/time-slots'}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Time Slot'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
