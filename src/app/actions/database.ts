'use server';

import { getCurrentUserRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchSchemaSnapshot,
  fetchTableCounts,
  DATABASE_TOOLS_SETUP_HINT,
} from '@/lib/database-tools';

export interface DatabaseTableOverview {
  name: string;
  rows: number;
  columns: number;
  rls: boolean;
}

export interface DatabaseOverview {
  ready: boolean;
  error?: string;
  database?: string;
  serverVersion?: string;
  generatedAt?: string;
  summary?: {
    tables: number;
    columns: number;
    views: number;
    functions: number;
    enums: number;
    policies: number;
    triggers: number;
    totalRows: number;
  };
  tables?: DatabaseTableOverview[];
}

export async function getDatabaseOverview(): Promise<DatabaseOverview> {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin') {
    return { ready: false, error: 'Only administrators can view the database tools.' };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      ready: false,
      error:
        error instanceof Error ? error.message : 'Database access is not configured.',
    };
  }

  try {
    const snapshot = await fetchSchemaSnapshot(admin);

    // Exact counts come from a SECURITY DEFINER RPC. If only the snapshot
    // function is installed, fall back to the planner's row estimates.
    const counts: Record<string, number> = {};
    try {
      const rows = await fetchTableCounts(admin);
      for (const row of rows) counts[row.table_name] = row.row_count;
    } catch {
      // Estimates below are good enough for a read-only overview.
    }

    const tables: DatabaseTableOverview[] = snapshot.tables
      .map((table) => ({
        name: table.name,
        rows: counts[table.name] ?? table.row_estimate ?? 0,
        columns: table.columns.length,
        rls: table.rls_enabled,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      ready: true,
      database: snapshot.database,
      serverVersion: snapshot.server_version,
      generatedAt: snapshot.generated_at,
      summary: {
        tables: snapshot.tables.length,
        columns: snapshot.tables.reduce((sum, table) => sum + table.columns.length, 0),
        views: snapshot.views.length,
        functions: snapshot.functions.length,
        enums: snapshot.enums.length,
        policies: snapshot.tables.reduce((sum, table) => sum + table.policies.length, 0),
        triggers: snapshot.tables.reduce((sum, table) => sum + table.triggers.length, 0),
        totalRows: tables.reduce((sum, table) => sum + table.rows, 0),
      },
      tables,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to read database metadata.';

    return {
      ready: false,
      error: message || DATABASE_TOOLS_SETUP_HINT,
    };
  }
}
