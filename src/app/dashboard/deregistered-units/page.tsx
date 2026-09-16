import {
  getDeregisteredUnits,
  countDeregisteredUnits,
  getDeregisteredUnitsPageData,
} from '@/app/actions/deregistered-units';
import { DeregisteredUnitsClient } from '@/components/deregistered-units/deregistered-units-client';

export default async function DeregisteredUnitsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page = Number(searchParams.page || 1);
  const limit = Number(searchParams.limit || 50);
  const offset = (page - 1) * limit;

  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const programId = typeof searchParams.programId === 'string' ? searchParams.programId : undefined;
  const intakeId = typeof searchParams.intakeId === 'string' ? searchParams.intakeId : undefined;
  const termId = typeof searchParams.termId === 'string' ? searchParams.termId : undefined;
  const courseId = typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined;
  const dateFrom = typeof searchParams.dateFrom === 'string' ? searchParams.dateFrom : undefined;
  const dateTo = typeof searchParams.dateTo === 'string' ? searchParams.dateTo : undefined;

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