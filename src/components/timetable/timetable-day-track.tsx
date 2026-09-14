'use client';

import { Pencil, Link, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Timetable } from '@/lib/types';
import {
  type DisplayTimeSlot,
  TIMETABLE_DAYS,
  TIMETABLE_DAY_LABELS,
  TIMETABLE_GRID,
  entriesForDay,
  formatTimeRange,
  getTimetableAxis,
  layoutDayEntries,
  minuteOffset,
  slotAxisSegments,
  trackMinHeight,
} from '@/lib/timetable-utils';
import { getProgrammeColourClasses, getSharedClassColourClasses } from '@/lib/programme-colours';

type TrackVariant = 'editor' | 'student' | 'print';

interface TimetableDayTrackProps {
  day: string;
  slots: DisplayTimeSlot[];
  entries: Timetable[];
  variant?: TrackVariant;
  onSlotClick?: (day: string, timeSlot: string) => void;
  onEntryClick?: (day: string, timeSlot: string, entry: Timetable) => void;
}

function getEntryColourClasses(entry: Timetable) {
  if (entry.class_type === 'shared') {
    return getSharedClassColourClasses();
  }
  const programmeId = entry.program_id || entry.programme_assignments?.[0]?.programme_id;
  const programmeName = entry.program?.name || entry.programme_assignments?.[0]?.programme?.name;
  return getProgrammeColourClasses(programmeId, programmeName);
}

function venueLabel(entry: Timetable) {
  if (!entry.room?.name) return 'Online';
  return entry.room.building ? `${entry.room.name} (${entry.room.building})` : entry.room.name;
}

export function TimetableDayTrack({
  day,
  slots,
  entries,
  variant = 'editor',
  onSlotClick,
  onEntryClick,
}: TimetableDayTrackProps) {
  const dayEntries = entriesForDay(entries, day);
  const { placements, laneCount, minutes } = layoutDayEntries(dayEntries, slots);
  const axis = getTimetableAxis(slots);
  const segments = slotAxisSegments(slots);
  const isPrint = variant === 'print';
  const laneMinHeight = trackMinHeight(variant);

  return (
    <div
      className="timetable-day-track relative box-border overflow-hidden"
      style={{ minHeight: laneMinHeight }}
    >
      <div
        className="pointer-events-none absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${minutes}, minmax(0, 1fr))` }}
      >
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`box-border border-r border-slate-200 ${
              segment.kind === 'gap' ? 'bg-slate-50' : ''
            }`}
            style={{ gridColumn: `${segment.start + 1} / ${segment.end + 1}` }}
          />
        ))}
        {onSlotClick &&
          slots.map((slot) => {
            const start = minuteOffset(slot.start, axis.start, axis.end);
            const end = minuteOffset(slot.end, axis.start, axis.end);
            if (end <= start) return null;
            const slotValue = `${slot.start}-${slot.end}`;
            return (
              <button
                key={slot.id}
                type="button"
                className="pointer-events-auto box-border cursor-pointer hover:bg-slate-50"
                style={{ gridColumn: `${start + 1} / ${end + 1}` }}
                aria-label={`Add class on ${day} ${slot.label}`}
                onClick={() => onSlotClick(day, slotValue)}
              />
            );
          })}
      </div>

      <div
        className="relative z-[1] grid"
        style={{
          gridTemplateColumns: `repeat(${minutes}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${laneCount}, minmax(${laneMinHeight}, auto))`,
        }}
      >
        {placements.map((placement) => {
          const entry = placement.item;
          const colourClasses = getEntryColourClasses(entry);
          const isShared = entry.class_type === 'shared';
          const slotValue = `${entry.start_time}-${entry.end_time}`;
          const programmeLabel =
            entry.program?.code ||
            entry.programme_assignments?.[0]?.programme?.code ||
            (variant === 'student' ? 'UNIT' : 'PROGRAMME');
          const programmeName =
            entry.program?.name || entry.programme_assignments?.[0]?.programme?.name || programmeLabel;

          return (
            <article
              key={entry.id}
              className={`timetable-event relative box-border overflow-hidden border-t border-b border-slate-200 p-1.5 text-left ${
                isPrint ? 'px-1 py-0.5' : 'p-1.5'
              } ${onEntryClick ? 'cursor-pointer' : ''}`}
              style={{
                gridColumn: `${placement.gridColumnStart} / ${placement.gridColumnEnd}`,
                gridRow: placement.lane + 1,
                borderLeftWidth: isPrint ? 2 : 4,
                borderLeftStyle: 'solid',
                borderLeftColor: colourClasses.border,
                borderRightWidth: placement.abutsNextInLane ? 0 : 1,
                borderRightStyle: 'solid',
                borderRightColor: '#e2e8f0',
                backgroundColor: colourClasses.background,
              }}
              onClick={
                onEntryClick
                  ? (event) => {
                      event.stopPropagation();
                      onEntryClick(day, slotValue, entry);
                    }
                  : undefined
              }
            >
              {onEntryClick && (
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded p-0.5 text-slate-500 hover:bg-white hover:text-slate-800"
                  aria-label={`Edit ${entry.course?.code || 'timetable entry'}`}
                  title="Edit timetable entry"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEntryClick(day, slotValue, entry);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}

              {variant === 'print' ? (
                <>
                  <p className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: colourClasses.text }}>
                    {isShared ? 'Shared' : programmeName}
                  </p>
                  {isShared && (
                    <div className="mb-0.5 flex items-center gap-1">
                      <Link className="h-2 w-2" style={{ color: colourClasses.text }} />
                      <span className="text-[7px] italic" style={{ color: colourClasses.text }}>
                        COMMON/SHARED
                      </span>
                    </div>
                  )}
                  <p className="text-[9px] font-bold leading-tight">{entry.course?.code || 'Unit'}</p>
                  <p className="text-[8px] leading-tight">{entry.course?.name}</p>
                  <p className="text-[8px] leading-tight">{entry.lecturer?.full_name || 'Default'}</p>
                  <p className="text-[8px] leading-tight">{venueLabel(entry)}</p>
                  <p className="text-[8px] leading-tight">{formatTimeRange(entry.start_time, entry.end_time)}</p>
                </>
              ) : (
                <>
                  <div className="mb-1 flex items-center gap-1">
                    {isShared ? (
                      <div className="flex items-center gap-1">
                        <Link className="h-3 w-3" style={{ color: colourClasses.text }} />
                        <span className="text-[9px] font-semibold" style={{ color: colourClasses.text }}>
                          SHARED CLASS
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-semibold" style={{ color: colourClasses.text }}>
                        {programmeLabel}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] font-bold leading-tight text-slate-900 ${onEntryClick ? 'pr-5' : ''}`}>
                    {entry.course?.code || 'Unit'}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-700">{entry.course?.name}</p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    Lecturer: {entry.lecturer?.full_name || 'Default'}
                  </p>
                  <p className="text-[10px] text-slate-600">Room: {entry.room?.name || 'Online'}</p>
                  <p className="mt-1 text-[10px] font-medium text-slate-800">
                    {formatTimeRange(entry.start_time, entry.end_time)}
                  </p>
                  {variant === 'editor' && (
                    <Badge status={entry.status} className="mt-1 text-[9px] uppercase tracking-wide">
                      {entry.status}
                    </Badge>
                  )}
                  {isShared && entry.programme_assignments && entry.programme_assignments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {entry.programme_assignments.slice(0, 3).map((assignment) => {
                        const progColour = getProgrammeColourClasses(
                          assignment.programme_id,
                          assignment.programme?.name
                        );
                        return (
                          <span
                            key={assignment.programme_id}
                            className="rounded-full px-1.5 py-0.5 text-[8px]"
                            style={{
                              backgroundColor: progColour.background,
                              color: progColour.text,
                              border: `1px solid ${progColour.border}`,
                            }}
                          >
                            {assignment.programme?.code || 'PROG'}
                          </span>
                        );
                      })}
                      {entry.programme_assignments.length > 3 && (
                        <span className="text-[8px] text-slate-500">
                          +{entry.programme_assignments.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}

        {variant === 'editor' && dayEntries.length === 0 && (
          <div className="pointer-events-none col-span-full flex items-center justify-center text-slate-300">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Add class on {day}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TimetableTimeAxis({
  slots,
  compact = false,
}: {
  slots: DisplayTimeSlot[];
  compact?: boolean;
}) {
  const axis = getTimetableAxis(slots);
  const segments = slotAxisSegments(slots);
  return (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${axis.minutes}, minmax(0, 1fr))` }}
    >
      {segments.map((segment) => (
        <div
          key={segment.id}
          className={`box-border border-r border-slate-200 text-center font-semibold text-slate-700 ${
            compact ? 'px-0.5 py-1 text-[9px] text-slate-900' : 'px-1 py-2 text-xs'
          } ${segment.kind === 'gap' ? 'bg-slate-50 font-normal text-slate-400' : ''}`}
          style={{ gridColumn: `${segment.start + 1} / ${segment.end + 1}` }}
        >
          {segment.label}
        </div>
      ))}
    </div>
  );
}

export function TimetableSlotHeaders(props: { slots: DisplayTimeSlot[]; compact?: boolean }) {
  return <TimetableTimeAxis {...props} />;
}

interface TimetableWeekTableProps {
  slots: DisplayTimeSlot[];
  entries: Timetable[];
  variant: TrackVariant;
  compact?: boolean;
  tableClassName?: string;
  onSlotClick?: (day: string, timeSlot: string) => void;
  onEntryClick?: (day: string, timeSlot: string, entry: Timetable) => void;
}

export function TimetableWeekTable({
  slots,
  entries,
  variant,
  compact = false,
  tableClassName = 'w-full min-w-[760px] table-fixed border-collapse',
  onSlotClick,
  onEntryClick,
}: TimetableWeekTableProps) {
  const isPrint = variant === 'print';
  const dayWidth = isPrint ? TIMETABLE_GRID.printDayColumnWidth : TIMETABLE_GRID.dayColumnWidth;
  const dayCellClass = compact
    ? 'print-timetable-cell border border-slate-400 px-1 py-1 font-semibold'
    : 'sticky left-0 z-10 border-r border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900';
  const dayHeadClass = compact
    ? 'border border-slate-500 bg-slate-100 px-1 py-1 text-left font-semibold'
    : 'sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold text-slate-700';

  return (
    <table className={tableClassName}>
      <thead>
        <tr className={compact ? undefined : 'border-b border-slate-200 bg-slate-50'}>
          <th className={dayHeadClass} style={{ width: dayWidth, minWidth: dayWidth }}>
            Day
          </th>
          <th className={`p-0 align-bottom ${compact ? 'border border-slate-500 bg-slate-100' : 'bg-slate-50'}`}>
            <TimetableTimeAxis slots={slots} compact={compact} />
          </th>
        </tr>
      </thead>
      <tbody>
        {TIMETABLE_DAYS.map((day) => (
          <tr key={day} className={compact ? undefined : 'border-b border-slate-100'}>
            <td className={dayCellClass} style={{ width: dayWidth, minWidth: dayWidth }} title={day}>
              {TIMETABLE_DAY_LABELS[day]}
            </td>
            <td className={`box-border p-0 align-top ${compact ? 'print-timetable-cell border border-slate-400' : ''}`}>
              <TimetableDayTrack
                day={day}
                slots={slots}
                entries={entries}
                variant={variant}
                onSlotClick={onSlotClick}
                onEntryClick={onEntryClick}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
