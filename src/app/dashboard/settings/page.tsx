import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfile } from '@/app/actions/dashboard';
import { getAdmissionNumberFormat, getPaymentSettings, getSystemSettings } from '@/app/actions/system-settings';
import { getPrograms } from '@/app/actions/programs';
import { isPesapalConfigured, getPesapalMissingConfig } from '@/lib/pesapal';
import { AdmissionFormatCard } from '@/components/settings/admission-format-card';
import { PaymentSettingsCard } from '@/components/settings/payment-settings-card';
import { WhatsAppSettingsCard } from '@/components/settings/whatsapp-settings-card';
import { ExternalLink } from 'lucide-react';

export default async function SettingsPage() {
  const profile = await getProfile();
  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin';
  const admissionFormat = isAdmin ? await getAdmissionNumberFormat() : null;
  const programs = isAdmin ? await getPrograms() : [];
  const paymentSettings = isAdmin ? await getPaymentSettings() : null;
  const systemSettings = isAdmin ? await getSystemSettings() : [];
  const pesapalConfigured = isPesapalConfigured();
  const pesapalMissingConfig = getPesapalMissingConfig();

  // Extract WhatsApp settings
  const whatsappSettings = isAdmin ? {
    enabled: systemSettings.find((s: any) => s.key === 'whatsapp_enabled')?.value === 'true',
    provider: systemSettings.find((s: any) => s.key === 'whatsapp_provider')?.value || 'twilio',
    financePhone: systemSettings.find((s: any) => s.key === 'whatsapp_finance_phone')?.value || '',
    enablePending: systemSettings.find((s: any) => s.key === 'whatsapp_enable_payment_pending')?.value === 'true',
    enableApproved: systemSettings.find((s: any) => s.key === 'whatsapp_enable_payment_approved')?.value === 'true',
    enableRejected: systemSettings.find((s: any) => s.key === 'whatsapp_enable_payment_rejected')?.value === 'true',
    twilioAccountSid: systemSettings.find((s: any) => s.key === 'whatsapp_twilio_account_sid')?.value || '',
    twilioAuthToken: systemSettings.find((s: any) => s.key === 'whatsapp_twilio_auth_token')?.value || '',
    twilioWhatsappNumber: systemSettings.find((s: any) => s.key === 'whatsapp_twilio_number')?.value || '',
    messagebirdApiKey: systemSettings.find((s: any) => s.key === 'whatsapp_messagebird_api_key')?.value || '',
    metaAccessToken: systemSettings.find((s: any) => s.key === 'whatsapp_meta_access_token')?.value || '',
    metaPhoneNumberId: systemSettings.find((s: any) => s.key === 'whatsapp_meta_phone_number_id')?.value || '',
  } : null;

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

        {isAdmin && admissionFormat && (
          <AdmissionFormatCard initialFormat={admissionFormat} programs={programs} />
        )}

        {isAdmin && paymentSettings && (
          <PaymentSettingsCard
            initialSettings={paymentSettings}
            pesapalConfigured={pesapalConfigured}
            pesapalMissingConfig={pesapalMissingConfig}
          />
        )}

        {isAdmin && (
          <WhatsAppSettingsCard initialSettings={whatsappSettings || undefined} />
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
