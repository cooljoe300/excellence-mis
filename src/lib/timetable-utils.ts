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

export function timelineRange(slots: DisplayTimeSlot[]): { start: number; end: number; minutes: number } {
  if (!slots.length) {
    const start = 8 * 60;
    const end = 20 * 60;
    return { start, end, minutes: end - start };
  }
  const start = timeToMinutes(slots[0].start);
  const end = timeToMinutes(slots[slots.length - 1].end);
  const minutes = Number.isNaN(start) || Number.isNaN(end) || end <= start ? 60 : end - start;
  return { start, end, minutes };
}

export function slotDurationMinutes(slot: DisplayTimeSlot): number {
  const start = timeToMinutes(slot.start);
  const end = timeToMinutes(slot.end);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 1;
  return end - start;
}

/** 0-based minute offset from the timeline start, clamped to the visible range. */
export function minuteOffset(time: string, rangeStart: number, rangeEnd: number): number {
  const minutes = timeToMinutes(time);
  if (Number.isNaN(minutes)) return 0;
  return Math.min(rangeEnd, Math.max(rangeStart, minutes)) - rangeStart;
}

export type PositionedTimetableEntry<T extends { start_time: string; end_time: string }> = {
  item: T;
  lane: number;
  /** 1-based inclusive CSS grid column start */
  gridColumnStart: number;
  /** 1-based exclusive CSS grid column end */
  gridColumnEnd: number;
  abutsNextInLane: boolean;
};

/**
 * Place events on a 1-minute CSS grid so consecutive lessons sharing an end/start
 * (e.g. 11:00–13:00 then 13:00–16:00) occupy adjacent tracks and share a grid line.
 * Intervals are half-open: [start, end).
 */
export function layoutDayEntries<T extends { start_time: string; end_time: string }>(
  entries: T[],
  slots: DisplayTimeSlot[]
): { placements: PositionedTimetableEntry<T>[]; laneCount: number; minutes: number } {
  const { start: rangeStart, end: rangeEnd, minutes } = timelineRange(slots);
  const sorted = [...entries].sort((a, b) => {
    const startDiff = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    if (startDiff !== 0) return startDiff;
    return timeToMinutes(a.end_time) - timeToMinutes(b.end_time);
  });

  const laneEnds: number[] = [];
  const raw: Array<{ item: T; lane: number; startOff: number; endOff: number }> = [];

  for (const item of sorted) {
    const startOff = minuteOffset(item.start_time, rangeStart, rangeEnd);
    const endOff = minuteOffset(item.end_time, rangeStart, rangeEnd);
    if (endOff <= startOff) continue;

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= startOff);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endOff);
    } else {
      laneEnds[lane] = endOff;
    }
    raw.push({ item, lane, startOff, endOff });
  }

  const placements: PositionedTimetableEntry<T>[] = raw.map((placement) => {
    const abutsNextInLane = raw.some(
      (other) =>
        other.lane === placement.lane &&
        other.startOff === placement.endOff &&
        other.item !== placement.item
    );
    return {
      item: placement.item,
      lane: placement.lane,
      gridColumnStart: placement.startOff + 1,
      gridColumnEnd: placement.endOff + 1,
      abutsNextInLane,
    };
  });

  return {
    placements,
    laneCount: Math.max(1, laneEnds.length),
    minutes,
  };
}

export function entriesForDay(entries: Timetable[], day: string): Timetable[] {
  return entries.filter((entry) => normalizeDay(entry.day) === day);
}
