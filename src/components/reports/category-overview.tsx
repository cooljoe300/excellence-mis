'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Banknote, ClipboardList, ArrowRight } from 'lucide-react';
import type { ReportsBundle } from '@/app/actions/reports';

interface CategoryOverviewProps {
  data: ReportsBundle;
}

export function CategoryOverview({ data }: CategoryOverviewProps) {
  const router = useRouter();

  const categories = [
    {
      key: 'student-reports',
      title: 'Student Reports',
      description: 'Student population, admissions, programme, intake, status and profile information',
      icon: Users,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      count: data.students.length,
      statLabel: 'Total Students',
    },
    {
      key: 'academic-reports',
      title: 'Academic Reports',
      description: 'Enrollments, programme enrollment, unit enrollment, academic records and attendance',
      icon: BookOpen,
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600',
      count: data.enrollments.length,
      statLabel: 'Total Enrollments',
    },
    {
      key: 'finance-reports',
      title: 'Finance Reports',
      description: 'Fee payments, payment history, outstanding fees, collections and payment analysis',
      icon: Banknote,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
      count: data.fees.length,
      statLabel: 'Fee Records',
    },
    {
      key: 'administrative-reports',
      title: 'Administrative Reports',
      description: 'Executive summary, admission statistics, programme statistics and data quality reports',
      icon: ClipboardList,
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600',
      count: data.programs.length,
      statLabel: 'Programmes',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-600">Select a category to view detailed reports and analytics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.key} className={`border-2 ${category.color} hover:shadow-lg transition-shadow`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${category.iconColor} bg-opacity-10`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-slate-900">{category.count}</div>
                    <div className="text-sm text-slate-600">{category.statLabel}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">{category.title}</CardTitle>
                <CardDescription className="mb-4">{category.description}</CardDescription>
                <Button
                  onClick={() => router.push(`/dashboard/reports?category=${category.key}`)}
                  className="w-full"
                >
                  Open Reports
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
