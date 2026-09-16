import {
  getDeregisteredUnits,
  countDeregisteredUnits,
  getDeregisteredUnitsPageData,
} from '@/app/actions/deregistered-units';
import { DeregisteredUnitsClient } from '@/components/deregistered-units/deregistered-units-client';

export default async function DeregisteredUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const limit = Number(params.limit || 50);
  const offset = (page - 1) * limit;

  const search = typeof params.search === 'string' ? params.search : undefined;
  const programId = typeof params.programId === 'string' ? params.programId : undefined;
  const intakeId = typeof params.intakeId === 'string' ? params.intakeId : undefined;
  const termId = typeof params.termId === 'string' ? params.termId : undefined;
  const courseId = typeof params.courseId === 'string' ? params.courseId : undefined;
  const dateFrom = typeof params.dateFrom === 'string' ? params.dateFrom : undefined;
  const dateTo = typeof params.dateTo === 'string' ? params.dateTo : undefined;

  const [deregisteredUnits, totalCount, pageData] = await Promise.all([
    getDeregisteredUnits({
      search,
      programId,
      intakeId,
      termId,
      courseId,
      dateFrom,
      dateTo,
      limit,
      offset,
    }),
    countDeregisteredUnits({
      search,
      programId,
      intakeId,
      termId,
      courseId,
      dateFrom,
      dateTo,
    }),
    getDeregisteredUnitsPageData(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <DeregisteredUnitsClient
      deregisteredUnits={deregisteredUnits}
      totalCount={totalCount}
      currentPage={page}
      totalPages={totalPages}
      limit={limit}
      pageData={pageData}
      filters={{ search, programId, intakeId, termId, courseId, dateFrom, dateTo }}
    />
  );
}