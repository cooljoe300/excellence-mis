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

/**
 * Canonical timetable axis used by Admin, Student, and print views.
 * Positioning is always computed from this grid — never from a separate student clock.
 */
export const TIMETABLE_GRID = {
  startTime: '07:00',
  endTime: '20:00',
  slotDurationMinutes: 60,
  dayTrackMinHeight: '5.75rem',
  printTrackMinHeight: '4.25rem',
  dayColumnWidth: '80px',
  printDayColumnWidth: '54px',
} as const;

export type DisplayTimeSlot = {
  id: string;
  start: string;
  end: string;
  label: string;
};

export function minutesToClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = ((totalMinutes % 60) + 60) % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function timeToMinutes(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const trimmed = value.trim();
  const match = trimmed.match(/T(\d{1,2}):(\d{2})/) || trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
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
  return minutesToClock(minutes);
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

export function defaultHourSlots(): DisplayTimeSlot[] {
  const start = timeToMinutes(TIMETABLE_GRID.startTime);
  const end = timeToMinutes(TIMETABLE_GRID.endTime);
  const step = TIMETABLE_GRID.slotDurationMinutes;
  const slots: DisplayTimeSlot[] = [];
  for (let minute = start, index = 0; minute < end; minute += step, index += 1) {
    const slotStart = minutesToClock(minute);
    const slotEnd = minutesToClock(Math.min(minute + step, end));
    slots.push({
      id: `grid-${index}`,
      start: slotStart,
      end: slotEnd,
      label: `${slotStart}–${slotEnd}`,
    });
  }
  return slots;
}

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
    .sort((a, b) => a.sort - b.sort || timeToMinutes(a.end) - timeToMinutes(b.end))
    .map(({ sort: _sort, ...slot }) => slot);

  return visible.length > 0 ? visible : defaultHourSlots();
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

export type TimetableAxis = {
  start: number;
  end: number;
  minutes: number;
};

/**
 * Shared time axis for every timetable surface. When configured slots exist,
 * the axis is the first slot start through the last slot end — not a synthetic
 * hourly clock. Lesson entries never change the axis, so Admin and Student stay aligned.
 */
export function getTimetableAxis(slots: DisplayTimeSlot[] = []): TimetableAxis {
  const gridStart = timeToMinutes(TIMETABLE_GRID.startTime);
  const gridEnd = timeToMinutes(TIMETABLE_GRID.endTime);

  if (slots.length > 0) {
    let start = Number.POSITIVE_INFINITY;
    let end = Number.NEGATIVE_INFINITY;
    for (const slot of slots) {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      if (!Number.isNaN(slotStart)) start = Math.min(start, slotStart);
      if (!Number.isNaN(slotEnd)) end = Math.max(end, slotEnd);
    }
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return { start, end, minutes: end - start };
    }
  }

  return { start: gridStart, end: gridEnd, minutes: gridEnd - gridStart };
}

export function timelineRange(slots: DisplayTimeSlot[]): TimetableAxis {
  return getTimetableAxis(slots);
}

export type SlotAxisSegment = {
  id: string;
  kind: 'slot' | 'gap';
  start: number;
  end: number;
  label: string;
};

/**
 * Columns for the shared grid: configured slots plus unlabeled gaps between them.
 * Does not invent hourly teaching periods.
 */
export function slotAxisSegments(slots: DisplayTimeSlot[]): SlotAxisSegment[] {
  const axis = getTimetableAxis(slots);
  const sorted = [...slots].sort((a, b) => {
    const startDiff = timeToMinutes(a.start) - timeToMinutes(b.start);
    if (startDiff !== 0) return startDiff;
    return timeToMinutes(a.end) - timeToMinutes(b.end);
  });

  const segments: SlotAxisSegment[] = [];
  let cursor = axis.start;

  for (const slot of sorted) {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    if (Number.isNaN(slotStart) || Number.isNaN(slotEnd) || slotEnd <= slotStart) continue;

    if (slotStart > cursor) {
      segments.push({
        id: `gap-${cursor}-${slotStart}`,
        kind: 'gap',
        start: cursor - axis.start,
        end: slotStart - axis.start,
        label: '',
      });
    }

    segments.push({
      id: slot.id,
      kind: 'slot',
      start: Math.max(slotStart, axis.start) - axis.start,
      end: Math.min(slotEnd, axis.end) - axis.start,
      label: slot.label,
    });
    cursor = Math.max(cursor, slotEnd);
  }

  if (cursor < axis.end) {
    segments.push({
      id: `gap-${cursor}-${axis.end}`,
      kind: 'gap',
      start: cursor - axis.start,
      end: axis.end - axis.start,
      label: '',
    });
  }

  return segments.filter((segment) => segment.end > segment.start);
}

export function hourMarks(axis: TimetableAxis): Array<{ start: number; end: number; label: string }> {
  const step = TIMETABLE_GRID.slotDurationMinutes;
  const marks: Array<{ start: number; end: number; label: string }> = [];
  for (let minute = axis.start; minute < axis.end; minute += step) {
    const next = Math.min(minute + step, axis.end);
    marks.push({
      start: minute - axis.start,
      end: next - axis.start,
      label: minutesToClock(minute),
    });
  }
  return marks;
}

function entrySpanOnAxis(
  item: { start_time: string; end_time: string },
  slots: DisplayTimeSlot[],
  rangeStart: number,
  rangeEnd: number
): { startOff: number; endOff: number } {
  const overlapping = slots
    .filter((slot) => timesOverlap(item.start_time, item.end_time, slot.start, slot.end))
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  if (overlapping.length > 0) {
    const startOff = minuteOffset(overlapping[0].start, rangeStart, rangeEnd);
    const endOff = minuteOffset(overlapping[overlapping.length - 1].end, rangeStart, rangeEnd);
    if (endOff > startOff) return { startOff, endOff };
  }

  return {
    startOff: minuteOffset(item.start_time, rangeStart, rangeEnd),
    endOff: minuteOffset(item.end_time, rangeStart, rangeEnd),
  };
}

export function trackMinHeight(variant: 'editor' | 'student' | 'print'): string {
  return variant === 'print' ? TIMETABLE_GRID.printTrackMinHeight : TIMETABLE_GRID.dayTrackMinHeight;
}

/** 1-based inclusive CSS grid column for a clock time on the shared axis. */
export function timeToGridColumnStart(time: string, axis: TimetableAxis): number {
  return minuteOffset(time, axis.start, axis.end) + 1;
}

/** 1-based exclusive CSS grid column for a clock time on the shared axis. */
export function timeToGridColumnEnd(time: string, axis: TimetableAxis): number {
  return minuteOffset(time, axis.start, axis.end) + 1;
}

export function durationToGridSpan(startTime: string, endTime: string, axis: TimetableAxis): number {
  return Math.max(1, minuteOffset(endTime, axis.start, axis.end) - minuteOffset(startTime, axis.start, axis.end));
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
    const { startOff, endOff } = entrySpanOnAxis(item, slots, rangeStart, rangeEnd);
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
