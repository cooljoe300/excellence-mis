import { getAcademicTerms } from '@/app/actions/academic-terms';
import { SemestersClient } from '@/components/semesters/semesters-client';

export default async function SemestersPage() {
  const terms = await getAcademicTerms();
  return <SemestersClient terms={terms} />;
}
