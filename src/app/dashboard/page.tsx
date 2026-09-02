import { Suspense } from 'react';
import { format } from 'date-fns';
import { getDashboardTerms, getProfile, resolveDashboardPeriod } from '@/app/actions/dashboard';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { KpiSkeleton, SectionSkeleton } from '@/components/dashboard/section';
import { SectionErrorBoundary } from '@/components/dashboard/section-error-boundary';
import {
  AcademicSection,
  ActivitySection,
  AttentionSection,
  DistributionSection,
  FinanceSection,
  KpiSection,
  QuickActions,
  StudentTrendSection,
} from '@/components/dashboard/sections';

function Block({ title, fallback, children }: { title: string; fallback: React.ReactNode; children: React.ReactNode }) {
  return (
    <SectionErrorBoundary title={title}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </SectionErrorBoundary>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const { term } = await searchParams;
  const [profile, terms, period] = await Promise.all([
    getProfile(),
    getDashboardTerms().catch(() => []),
    resolveDashboardPeriod(term),
  ]);

  const now = new Date();
  const firstName = (profile?.full_name as string | undefined)?.split(' ')[0] || 'Admin';

  return (
    <div className="mx-auto max-w-[1400px]">
      <DashboardHeader
        name={firstName}
        terms={terms}
        selectedTermId={period.term?.id ?? null}
        today={format(now, 'EEEE, d MMMM yyyy')}
        hour={now.getHours()}
      />

      <div className="space-y-4 lg:space-y-6">
        <Block
          title="Key metrics"
          fallback={
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <KpiSkeleton key={i} />
              ))}
            </div>
          }
        >
          <KpiSection period={period} />
        </Block>

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-3">
          <div className="space-y-4 lg:space-y-6 xl:col-span-2">
            <Block title="Student Overview" fallback={<SectionSkeleton title="Student Overview" height={280} />}>
              <StudentTrendSection />
            </Block>

            <Block
              title="Student Distribution"
              fallback={
                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionSkeleton title="Students by Program" height={220} />
                  <SectionSkeleton title="Student Status" height={220} />
                </div>
              }
            >
              <DistributionSection period={period} />
            </Block>

            <Block title="Financial Overview" fallback={<SectionSkeleton title="Financial Overview" height={280} />}>
              <FinanceSection period={period} />
            </Block>
          </div>

          <div className="space-y-4 lg:space-y-6">
            <QuickActions />

            <Block title="Requires Attention" fallback={<SectionSkeleton title="Requires Attention" height={180} />}>
              <AttentionSection />
            </Block>

            <Block title="Academic Overview" fallback={<SectionSkeleton title="Academic Overview" height={180} />}>
              <AcademicSection period={period} />
            </Block>

            <Block title="Recent Activity" fallback={<SectionSkeleton title="Recent Activity" height={320} />}>
              <ActivitySection />
            </Block>
          </div>
        </div>
      </div>
    </div>
  );
}
