'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

export interface Series {
  key: string;
  label: string;
  color: string;
}

const fmtNumber = (n: number) => n.toLocaleString('en-KE');

function niceMax(max: number) {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  const step = max / mag;
  const nice = step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : 10;
  return nice * mag;
}

// ---------------------------------------------------------------------------
// Line chart
// ---------------------------------------------------------------------------

export function LineChart({
  data,
  series,
  formatValue = fmtNumber,
  height = 260,
  className,
  ariaLabel,
}: {
  data: Record<string, number | string>[];
  series: Series[];
  formatValue?: (n: number) => string;
  height?: number;
  className?: string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const width = 800;
  const pad = { top: 16, right: 16, bottom: 32, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))));
  const n = data.length;
  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  const path = (key: string) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(Number(d[key]) || 0).toFixed(1)}`).join(' ');

  const active = hover !== null ? data[hover] : null;

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * width;
          const idx = Math.round(((px - pad.left) / innerW) * (n - 1));
          setHover(Math.min(n - 1, Math.max(0, idx)));
        }}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {formatValue(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={height - 10} textAnchor="middle" fontSize="11" fill="#64748b">
              {String(d.label)}
            </text>
          ) : null
        )}
        {series.map((s, si) => (
          <g key={s.key}>
            {si === 0 && n > 1 && (
              <path
                d={`${path(s.key)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                fill={`url(#${id}-${s.key})`}
              />
            )}
            <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#94a3b8" strokeDasharray="3 3" />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(Number(data[hover][s.key]) || 0)} r="4.5" fill="white" stroke={s.color} strokeWidth="2.5" />
            ))}
          </g>
        )}
      </svg>
      {active && hover !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-[140px] rounded-lg border border-border bg-white p-2.5 text-xs shadow-md"
          style={{ left: `${(x(hover) / width) * 100}%`, transform: `translateX(${hover > n / 2 ? '-110%' : '10%'})` }}
        >
          <p className="mb-1.5 font-semibold text-slate-900">{String(active.label)}</p>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="font-medium text-slate-900">{formatValue(Number(active[s.key]) || 0)}</span>
            </div>
          ))}
        </div>
      )}
      <Legend series={series} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped bar chart
// ---------------------------------------------------------------------------

export function BarChart({
  data,
  series,
  formatValue = fmtNumber,
  formatTick = formatValue,
  height = 260,
  ariaLabel,
}: {
  data: Record<string, number | string>[];
  series: Series[];
  formatValue?: (n: number) => string;
  formatTick?: (n: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 800;
  const pad = { top: 16, right: 16, bottom: 32, left: 64 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))));
  const n = data.length;
  const groupW = innerW / Math.max(1, n);
  const barW = Math.min(36, (groupW * 0.7) / series.length);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const gx = pad.left + i * groupW + groupW / 2;
          const totalW = barW * series.length + 4 * (series.length - 1);
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={pad.left + i * groupW} y={pad.top} width={groupW} height={innerH} fill={hover === i ? '#f1f5f9' : 'transparent'} />
              {series.map((s, si) => {
                const v = Number(d[s.key]) || 0;
                const bx = gx - totalW / 2 + si * (barW + 4);
                return <rect key={s.key} x={bx} y={y(v)} width={barW} height={Math.max(0, y(0) - y(v))} rx="4" fill={s.color} />;
              })}
              <text x={gx} y={height - 10} textAnchor="middle" fontSize="11" fill="#64748b">
                {String(d.label)}
              </text>
            </g>
          );
        })}
      </svg>
      {active && hover !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-[160px] rounded-lg border border-border bg-white p-2.5 text-xs shadow-md"
          style={{ left: `${((pad.left + hover * groupW + groupW / 2) / width) * 100}%`, transform: `translateX(${hover > n / 2 ? '-110%' : '10%'})` }}
        >
          <p className="mb-1.5 font-semibold text-slate-900">{String(active.label)}</p>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="font-medium text-slate-900">{formatValue(Number(active[s.key]) || 0)}</span>
            </div>
          ))}
        </div>
      )}
      <Legend series={series} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bars
// ---------------------------------------------------------------------------

export function HorizontalBars({
  items,
  color = '#003380',
}: {
  items: { label: string; value: number; hint?: string }[];
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700" title={item.label}>
              {item.label}
              {item.hint && <span className="ml-1.5 text-xs font-normal text-muted">{item.hint}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-slate-900">
              {fmtNumber(item.value)}
              <span className="ml-1 text-xs text-muted">({total ? Math.round((item.value / total) * 100) : 0}%)</span>
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="meter"
            aria-label={item.label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={item.value}
          >
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(item.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Donut
// ---------------------------------------------------------------------------

export function DonutChart({
  segments,
  centerLabel,
  ariaLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 70;
  const c = 2 * Math.PI * r;
  const arcs = segments.reduce<{ len: number; offset: number }[]>((acc, seg) => {
    const len = total ? (seg.value / total) * c : 0;
    const prev = acc[acc.length - 1];
    acc.push({ len, offset: prev ? prev.offset + prev.len : 0 });
    return acc;
  }, []);
  const shown = hover !== null ? segments[hover] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        {segments.map((seg, i) => {
          const { len, offset } = arcs[i];
          return (
            <circle
              key={seg.label}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={hover === i ? 24 : 20}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
              className="transition-all duration-200"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
        <text x="90" y="86" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a">
          {fmtNumber(shown ? shown.value : total)}
        </text>
        <text x="90" y="106" textAnchor="middle" fontSize="11" fill="#64748b">
          {shown ? shown.label : centerLabel}
        </text>
      </svg>
      <ul className="grid w-full grid-cols-2 gap-x-6 gap-y-2 text-sm sm:w-auto sm:grid-cols-1">
        {segments.map((seg, i) => (
          <li
            key={seg.label}
            className={cn('flex items-center justify-between gap-4 rounded-md px-1.5 py-0.5', hover === i && 'bg-slate-50')}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: seg.color }} aria-hidden />
              {seg.label}
            </span>
            <span className="tabular-nums font-medium text-slate-900">
              {fmtNumber(seg.value)}
              <span className="ml-1 text-xs font-normal text-muted">{total ? Math.round((seg.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-600">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}
