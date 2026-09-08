import type { TimeSlot, Timetable } from '@/lib/types';

export const TIMETABLE_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const TIMETABLE_DAY_LABELS: Record<(typeof TIMETABLE_DAYS)[number], string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

const FALLBACK_SLOTS = [
  { start: '08:00', end: '10:00' },
  { start: '10:00', end: '12:00' },
  { start: '12:00', end: '14:00' },
  { start: '14:00', end: '16:00' },
  { start: '16:00', end: '18:00' },
  { start: '18:00', end: '20:00' },
];

export function timeToMinutes(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.NaN;
  return hours * 60 + minutes;
}

export function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  return `${formatClockTime(start)}–${formatClockTime(end)}`;
}

export function formatClockTime(value: string | null | undefined): string {
  const minutes = timeToMinutes(value);
  if (Number.isNaN(minutes)) return value?.slice(0, 5) || '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function toTimeInputValue(value: string | null | undefined): string {
  return formatClockTime(value) === '—' ? '' : formatClockTime(value);
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false;
  return aStart < bEnd && aEnd > bStart;
}

export function normalizeDay(day: string | null | undefined): string {
  if (!day) return '';
  const match = TIMETABLE_DAYS.find((d) => d.toLowerCase() === day.trim().toLowerCase());
  return match || day;
}

export function weekdayLong(date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export type DisplayTimeSlot = {
  id: string;
  start: string;
  end: string;
  label: string;
};

export function getDisplayTimeSlots(timeSlots: TimeSlot[]): DisplayTimeSlot[] {
  const visible = (timeSlots || [])
    .filter((slot) => slot.is_active !== false && slot.is_visible !== false)
    .map((slot) => ({
      id: slot.id,
      start: formatClockTime(slot.start_time),
      end: formatClockTime(slot.end_time),
      label: formatTimeRange(slot.start_time, slot.end_time),
      sort: timeToMinutes(slot.start_time),
    }))
    .filter((slot) => !Number.isNaN(slot.sort))
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort: _sort, ...slot }) => slot);

  if (visible.length > 0) return visible;

  return FALLBACK_SLOTS.map((slot, index) => ({
    id: `fallback-${index}`,
    start: slot.start,
    end: slot.end,
    label: `${slot.start}–${slot.end}`,
  }));
}

export function durationMinutes(start: string, end: string): number {
  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(end);
  if (Number.isNaN(startMins) || Number.isNaN(endMins) || endMins <= startMins) return 60;
  return endMins - startMins;
}

export function entriesForSlot(entries: Timetable[], day: string, slot: DisplayTimeSlot): Timetable[] {
  return entries.filter((entry) => {
    if (normalizeDay(entry.day) !== day) return false;
    return timesOverlap(entry.start_time, entry.end_time, slot.start, slot.end);
  });
}

export function isPrimarySlotForEntry(entry: Timetable, slot: DisplayTimeSlot): boolean {
  const start = timeToMinutes(entry.start_time);
  const slotStart = timeToMinutes(slot.start);
  const slotEnd = timeToMinutes(slot.end);
  if ([start, slotStart, slotEnd].some(Number.isNaN)) return false;
  return start >= slotStart && start < slotEnd;
}

export function cardHeightForDuration(start: string, end: string): number {
  const minutes = durationMinutes(start, end);
  const blocks = Math.max(1, minutes / 60);
  // Base height per hour (72px) minus padding/border space for clean stacking
  // This ensures consecutive events (e.g., 11:00-13:00 followed by 13:00-16:00) sit flush
  return Math.round(Math.min(220, Math.max(88, blocks * 68)));
}
