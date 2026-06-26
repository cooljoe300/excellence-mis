import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfile } from '@/app/actions/dashboard';
import { getAdmissionNumberFormat, getPaymentSettings } from '@/app/actions/system-settings';
import { AdmissionFormatCard } from '@/components/settings/admission-format-card';
import { PaymentSettingsCard } from '@/components/settings/payment-settings-card';
import { ExternalLink } from 'lucide-react';

export default async function SettingsPage() {
  const profile = await getProfile();
  const admissionFormat = profile?.role === 'admin' ? await getAdmissionNumberFormat() : null;
  const paymentSettings = profile?.role === 'admin' ? await getPaymentSettings() : null;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Account and system configuration"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Name</span>
              <span className="font-medium">{profile?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-medium">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role</span>
              <span className="font-medium capitalize">{profile?.role}</span>
            </div>
          </CardContent>
        </Card>

        {profile?.role === 'admin' && admissionFormat && (
          <AdmissionFormatCard initialFormat={admissionFormat} />
        )}

        {profile?.role === 'admin' && paymentSettings && (
          <PaymentSettingsCard initialSettings={paymentSettings} />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Moodle LMS</p>
                  <p className="text-slate-500">lms.excellenceonlinecollege.com</p>
                </div>
                <a
                  href="https://lms.excellenceonlinecollege.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="mt-3 text-slate-500">
                Link students to their LMS username in the student profile to cross-reference accounts.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="font-medium text-slate-900">Supabase</p>
              <p className="text-slate-500">Database, authentication, and row-level security</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="font-medium text-slate-900">Vercel</p>
              <p className="text-slate-500">Hosting and deployment platform</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
