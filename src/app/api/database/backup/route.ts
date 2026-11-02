import { NextResponse } from 'next/server';
import { getCurrentUserRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildJsonBackup } from '@/lib/database-backup';
import { DATABASE_TOOLS_SETUP_HINT } from '@/lib/database-tools';
import { logAudit } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin') {
    return NextResponse.json(
      { error: 'Only administrators can download database backups.' },
      { status: 403 }
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
    const { backup, filename } = await buildJsonBackup(admin);
    const completedTables = Object.keys(backup.counts).length;
    const failedTables = Object.keys(backup.errors);

    await logAudit({
      action: 'export',
      module: 'database',
      entityType: 'database_backup',
      entityName: filename,
      details: `JSON backup: ${backup.total_rows} rows across ${completedTables} tables${
        failedTables.length > 0 ? `; failed: ${failedTables.join(', ')}` : ''
      }`,
      actorType: 'ADMIN',
    });

    return new Response(JSON.stringify(backup), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build the backup.';
    const notInstalled = message === DATABASE_TOOLS_SETUP_HINT;

    return NextResponse.json(
      { error: message },
      { status: notInstalled ? 503 : 500 }
    );
  }
}
