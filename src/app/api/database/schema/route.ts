import { NextResponse } from 'next/server';
import { getCurrentUserRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildSchemaSql,
  fetchSchemaSnapshot,
  DATABASE_TOOLS_SETUP_HINT,
} from '@/lib/database-tools';
import { logAudit } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export async function GET(request: Request) {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin') {
    return NextResponse.json(
      { error: 'Only administrators can export the database schema.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get('format') ?? 'sql').toLowerCase();

  if (format !== 'sql' && format !== 'json') {
    return NextResponse.json(
      { error: 'Unsupported format. Use format=sql or format=json.' },
      { status: 400 }
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database access is not configured.' },
      { status: 500 }
    );
  }

  try {
    const snapshot = await fetchSchemaSnapshot(admin);
    const stamp = timestamp();

    let body: string;
    let filename: string;
    let contentType: string;

    if (format === 'json') {
      body = JSON.stringify(snapshot, null, 2);
      filename = `excellence-mis-schema-${stamp}.json`;
      contentType = 'application/json; charset=utf-8';
    } else {
      body = buildSchemaSql(snapshot);
      filename = `excellence-mis-schema-${stamp}.sql`;
      contentType = 'application/sql; charset=utf-8';
    }

    await logAudit({
      action: 'export',
      module: 'database',
      entityType: 'database_schema',
      entityName: filename,
      details: `Schema export (${format.toUpperCase()}): ${snapshot.tables.length} tables, ${snapshot.functions.length} functions.`,
      actorType: 'ADMIN',
    });

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export the schema.';
    const notInstalled = message === DATABASE_TOOLS_SETUP_HINT;

    return NextResponse.json(
      { error: message },
      { status: notInstalled ? 503 : 500 }
    );
  }
}
