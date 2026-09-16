import {
  getAuditLogs,
  countAuditLogs,
  getAuditLogModules,
  getAuditLogActions,
  getAuditLogEntityTypes,
} from '@/app/actions/audit-logs';
import { AuditLogsClient } from '@/components/audit-logs/audit-logs-client';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const limit = Number(params.limit || 50);
  const offset = (page - 1) * limit;

  const search = typeof params.search === 'string' ? params.search : undefined;
  const userId = typeof params.userId === 'string' ? params.userId : undefined;
  const action = typeof params.action === 'string' ? params.action : undefined;
  const module = typeof params.module === 'string' ? params.module : undefined;
  const entityType = typeof params.entityType === 'string' ? params.entityType : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const dateFrom = typeof params.dateFrom === 'string' ? params.dateFrom : undefined;
  const dateTo = typeof params.dateTo === 'string' ? params.dateTo : undefined;

  const [auditLogs, totalCount, modules, actions, entityTypes] = await Promise.all([
    getAuditLogs(
      { search, userId, action, module, entityType, status, dateFrom, dateTo },
      limit,
      offset
    ),
    countAuditLogs({ search, userId, action, module, entityType, status, dateFrom, dateTo }),
    getAuditLogModules(),
    getAuditLogActions(),
    getAuditLogEntityTypes(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <AuditLogsClient
      auditLogs={auditLogs}
      totalCount={totalCount}
      currentPage={page}
      totalPages={totalPages}
      limit={limit}
      pageData={{ modules, actions, entityTypes }}
      filters={{ search, userId, action, module, entityType, status, dateFrom, dateTo }}
    />
  );
}
