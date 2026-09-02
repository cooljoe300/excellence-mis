'use client';

import { BarChart } from '@/components/dashboard/charts';
import { formatCurrency } from '@/lib/utils';

const SERIES = [
  { key: 'collected', label: 'Collected', color: '#003380' },
  { key: 'outstanding', label: 'Outstanding', color: '#d97706' },
];

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('en-KE', { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('en-KE', { maximumFractionDigits: 0 })}K`;
  return n.toLocaleString('en-KE');
}

export function FinanceChart({ data }: { data: { label: string; collected: number; outstanding: number }[] }) {
  return (
    <BarChart
      data={data}
      series={SERIES}
      formatValue={formatCurrency}
      formatTick={compact}
      ariaLabel="Fees collected versus outstanding per month"
    />
  );
}
