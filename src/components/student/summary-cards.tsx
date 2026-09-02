import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, BookOpen, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SummaryCardsProps {
  summary: {
    semesterName: string | null;
    registeredUnitsCount: number;
    totalFees: number;
    feesPaid: number;
    feesBalance: number;
  };
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SemesterCard semesterName={summary.semesterName} />
      <UnitsCard count={summary.registeredUnitsCount} />
      <FeesPaidCard amount={summary.feesPaid} />
      <BalanceCard amount={summary.feesBalance} />
    </div>
  );
}

function SemesterCard({ semesterName }: { semesterName: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-blue-700" />
          Current Semester
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-slate-900">
          {semesterName || 'Not assigned'}
        </p>
        <p className="text-sm text-slate-500">
          {semesterName ? 'Academic period' : 'Contact administration'}
        </p>
      </CardContent>
    </Card>
  );
}

function UnitsCard({ count }: { count: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-blue-700" />
          Registered Units
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-slate-900">{count}</p>
        <p className="text-sm text-slate-500">
          {count === 0 ? 'No units registered' : 'Current semester'}
        </p>
      </CardContent>
    </Card>
  );
}

function FeesPaidCard({ amount }: { amount: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-blue-700" />
          Fees Paid
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-slate-900">
          {formatCurrency(amount)}
        </p>
        <p className="text-sm text-slate-500">
          {amount === 0 ? 'No payments made' : 'Total paid'}
        </p>
      </CardContent>
    </Card>
  );
}

function BalanceCard({ amount }: { amount: number }) {
  const isPaidInFull = amount === 0;
  
  return (
    <Card className={isPaidInFull ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-blue-700" />
          Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${isPaidInFull ? 'text-emerald-700' : 'text-amber-700'}`}>
          {formatCurrency(amount)}
        </p>
        <p className={`text-sm ${isPaidInFull ? 'text-emerald-600' : 'text-amber-600'}`}>
          {isPaidInFull ? 'Fully paid' : 'Outstanding balance'}
        </p>
      </CardContent>
    </Card>
  );
}