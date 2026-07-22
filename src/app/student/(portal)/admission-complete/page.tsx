import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, User, GraduationCap, CreditCard, Receipt, FileText, ArrowRight } from 'lucide-react';

export default async function AdmissionCompletePage() {
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

  return (
    <div>
      <PageHeader
        title="Admission Completed Successfully"
        description="You have been registered, enrolled, and your fee invoice has been generated"
      />

      <Card className="mb-6 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-center text-xl font-semibold text-slate-900 mb-6">
            Welcome to Excellence Online College!
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-5 w-5 text-emerald-600" />
              <span className="text-slate-700">Student Registered</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              <span className="text-slate-700">Enrollment Created</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <span className="text-slate-700">Fee Structure Generated</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <span className="text-slate-700">Invoice Created</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/student" className="block">
              <Button variant="secondary" className="w-full justify-between group">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Go to Student Portal
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/student/fees" className="block">
              <Button variant="secondary" className="w-full justify-between group">
                <span className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  View Fee Statement
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/student/id-card" className="block">
              <Button variant="secondary" className="w-full justify-between group">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  View ID Card
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-slate-500">
        <p>If you have any questions, please contact the college administration.</p>
      </div>
    </div>
  );
}
