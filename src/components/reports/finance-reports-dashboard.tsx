'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, DollarSign, FileText, Download, ArrowRight, Banknote, Calendar, Briefcase, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReportsBundle } from '@/app/actions/reports';
import { getFeeBalance } from '@/lib/utils';

interface FinanceReportsDashboardProps {
  data: ReportsBundle;
}

export function FinanceReportsDashboard({ data }: FinanceReportsDashboardProps) {
  const router = useRouter();

  // Calculate finance KPIs
  const totalFees = data.fees.length;
  const totalExpected = data.fees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
  const totalPaid = data.fees.reduce((sum, fee) => sum + Number(fee.amount_paid || 0), 0);
  const totalOutstanding = data.fees.reduce((sum, fee) => sum + getFeeBalance(fee), 0);
  
  const fullyPaidStudents = new Set(data.fees.filter(fee => getFeeBalance(fee) === 0).map(fee => fee.student_id)).size;
  const studentsWithBalances = new Set(data.fees.filter(fee => getFeeBalance(fee) > 0).map(fee => fee.student_id)).size;
  const zeroPaymentStudents = new Set(data.fees.filter(fee => Number(fee.amount_paid) === 0).map(fee => fee.student_id)).size;
  const partiallyPaidStudents = new Set(data.fees.filter(fee => Number(fee.amount_paid) > 0 && getFeeBalance(fee) > 0).map(fee => fee.student_id)).size;

  // Calculate collections by payment method
  const collectionsByMethod = data.fees.reduce((acc, fee) => {
    if (fee.payment_method) {
      const method = fee.payment_method;
      acc[method] = (acc[method] || 0) + Number(fee.amount_paid || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const financeReports = [
    {
      key: 'fee-summary',
      title: 'Fee Payments',
      description: 'Fee collection totals from live payment records',
      count: totalFees,
      icon: CreditCard,
    },
    {
      key: 'fee-ledger',
      title: 'Payment History',
      description: 'Invoice ledger with student contact details',
      count: new Set(data.fees.map(f => f.student_id)).size,
      icon: FileText,
    },
    {
      key: 'outstanding-fees',
      title: 'Outstanding Fees',
      description: 'Invoices that still have a balance',
      count: studentsWithBalances,
      icon: DollarSign,
    },
    {
      key: 'fully-paid-students',
      title: 'Fully Paid Students',
      description: 'Invoices with no remaining balance',
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
      description: 'Invoices with no payment received',
      count: zeroPaymentStudents,
      icon: CreditCard,
    },
    {
      key: 'partially-paid-students',
      title: 'Partially Paid',
      description: 'Invoices that are partially paid',
      count: partiallyPaidStudents,
      icon: CreditCard,
    },
    {
      key: 'collection-by-date',
      title: 'Collection by Date',
      description: 'Paid and partial collections grouped by date',
      count: totalFees,
      icon: Calendar,
    },
    {
      key: 'collection-by-program',
      title: 'Collection by Programme',
      description: 'Fee collection performance by programme',
      count: totalFees,
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
    router.push(`/dashboard/reports?report=${reportKey}`);
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
            <div className="text-3xl font-bold text-slate-900">{totalExpected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{totalOutstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalFees}</div>
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
                        style={{ width: `${(amount / totalPaid) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-24 text-right">{amount.toLocaleString()}</span>
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
