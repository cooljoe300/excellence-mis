import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { CurriculumClient } from '@/components/curriculum/curriculum-client';
import { GraduationCap } from 'lucide-react';

export default function CurriculumPage() {
  return (
    <div>
      <PageHeader
        title="Curricula"
        description="Configure programme curricula, academic years, semesters and units. Programme enrollment and unit registration read from these settings."
        action={
          <Link href="/dashboard/programs">
            <Button variant="secondary">
              <GraduationCap className="h-4 w-4" />
              Programmes
            </Button>
          </Link>
        }
      />
      <CurriculumClient />
    </div>
  );
}
