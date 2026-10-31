'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, DollarSign, FileText, Banknote, Calendar, Briefcase, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReportsBundle } from '@/app/actions/reports';
import { formatCurrency } from '@/lib/utils';
import { invoicePaid, summarizeFeeTotals, summarizeFeesByStudent } from '@/lib/fee-money';

interface FinanceReportsDashboardProps {
  data: ReportsBundle;
}

export function FinanceReportsDashboard({ data }: FinanceReportsDashboardProps) {
  const router = useRouter();

  const totals = summarizeFeeTotals(data.fees);
  const summaries = summarizeFeesByStudent(data.fees);

  const fullyPaidStudents = totals.settledStudents;
  const studentsWithBalances = totals.studentsWithBalance;
  const zeroPaymentStudents = totals.unpaidStudents;
  const partiallyPaidStudents = totals.partialStudents;

  // Collections by payment method, per invoice (not per student).
  const collectionsByMethod = data.fees.reduce((acc, fee) => {
    const paid = invoicePaid(fee);
    if (!fee.payment_method || paid <= 0) return acc;
    acc[fee.payment_method] = (acc[fee.payment_method] || 0) + paid;
    return acc;
  }, {} as Record<string, number>);

  const financeReports = [
    {
      key: 'fee-summary',
      title: 'Fee Payments',
      description: 'Billed, collected, outstanding and credit totals',
      count: totals.invoiceCount,
      icon: CreditCard,
    },
    {
      key: 'fee-ledger',
      title: 'Payment History',
      description: 'Every invoice with student contact details',
      count: summaries.length,
      icon: FileText,
    },
    {
      key: 'outstanding-fees',
      title: 'Outstanding Fees',
      description: 'Students whose combined invoices still have a balance',
      count: studentsWithBalances,
      icon: DollarSign,
    },
    {
      key: 'fully-paid-students',
      title: 'Fully Paid Students',
      description: 'Students whose combined invoices are fully settled',
      count: fullyPaidStudents,
      icon: Wallet,
    },
    {
      key: 'students-with-balances',
      title: 'Students with Balances',
      description: 'Students whose combined invoices still have a balance',
      count: studentsWithBalances,
      icon: DollarSign,
    },
    {
      key: 'zero-payment-students',
      title: 'Zero Payment',
      description: 'Students with billed invoices and no payment recorded',
      count: zeroPaymentStudents,
      icon: CreditCard,
    },
    {
      key: 'partially-paid-students',
      title: 'Partially Paid',
      description: 'Students who have paid part of their balance',
      count: partiallyPaidStudents,
      icon: CreditCard,
    },
    {
      key: 'collection-by-date',
      title: 'Collection by Date',
      description: 'Money received grouped by payment date',
      count: totals.invoiceCount,
      icon: Calendar,
    },
    {
      key: 'collection-by-program',
      title: 'Collection by Programme',
      description: 'Fee collection performance by programme',
      count: totals.invoiceCount,
      icon: Briefcase,
    },
    {
      key: 'collection-by-method',
      title: 'Collection by Method',
      description: 'Fee collection grouped by payment method',
      count: Object.keys(collectionsByMethod).length,
      icon: Banknote,
    },
  ];

  const navigateToReport = (reportKey: string) => {
    router.push(`/dashboard/reports?category=finance-reports&report=${reportKey}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance Reports</h1>
        <p className="text-slate-600">Fee payments, payment history, outstanding fees, collections and payment analysis</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Fees Expected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(totals.billed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(totals.paid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(totals.outstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Credit Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(totals.credit)}</div>
            <p className="mt-1 text-xs text-slate-500">{totals.invoiceCount} invoices</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Fully Paid Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{fullyPaidStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Students With Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{studentsWithBalances}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Zero Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{zeroPaymentStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Partially Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{partiallyPaidStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Distribution */}
      {Object.keys(collectionsByMethod).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Distribution</CardTitle>
            <CardDescription>Collection breakdown by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(collectionsByMethod).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{method}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-600 rounded-full" 
                        style={{ width: `${totals.paid > 0 ? (amount / totals.paid) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-24 text-right">{formatCurrency(amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finance Reports List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {financeReports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.key} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {report.count}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="mb-4 text-sm">{report.description}</CardDescription>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => navigateToReport(report.key)}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
