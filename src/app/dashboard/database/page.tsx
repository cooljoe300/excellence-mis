import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/auth';
import { getDatabaseOverview } from '@/app/actions/database';
import { DatabaseToolsCard } from '@/components/database/database-tools-card';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Database, Layers, ShieldAlert, ShieldCheck, Table2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatNumber(value: number) {
  return value.toLocaleString('en-US');
}

export default async function DatabasePage() {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin') redirect('/dashboard');

  const overview = await getDatabaseOverview();

  if (!overview.ready || !overview.summary) {
    return (
      <div>
        <PageHeader
          title="Database"
          description="Back up application data and extract the complete database schema."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Database tools are not installed
            </CardTitle>
            <CardDescription>
              Run the migration below once in Supabase, then reload this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>{overview.error}</p>
            <div className="rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-100">
              supabase/migrations/059_database_tools.sql
            </div>
            <p>
              Open the Supabase dashboard → SQL Editor, paste the contents of that file and run it.
              It creates two read-only, service-role-only functions that expose the schema catalog
              and exact row counts to this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, tables = [] } = overview;

  const stats = [
    { label: 'Tables', value: summary.tables, icon: Table2 },
    { label: 'Total rows', value: summary.totalRows, icon: Layers },
    { label: 'Columns', value: summary.columns, icon: Database },
    { label: 'RLS policies', value: summary.policies, icon: ShieldCheck },
  ];

  return (
    <div>
      <PageHeader
        title="Database"
        description="Back up application data and extract the complete schema of the system."
        action={
          <div className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:block">
            {overview.database} · PostgreSQL {overview.serverVersion}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatNumber(stat.value)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        <span>{formatNumber(summary.views)} views</span>
        <span>{formatNumber(summary.functions)} functions &amp; procedures</span>
        <span>{formatNumber(summary.triggers)} triggers</span>
        <span>{formatNumber(summary.enums)} enum types</span>
        {overview.generatedAt && (
          <span>
            Snapshot: {new Date(overview.generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <DatabaseToolsCard />

        <Card>
          <CardHeader>
            <CardTitle>What a backup contains</CardTitle>
            <CardDescription>
              The full backup is a single JSON file with schema, data and metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              Included: the complete schema snapshot, every row in every public table, auth
              account metadata (emails, roles and metadata — never passwords) and the storage
              bucket list.
            </p>
            <p>
              Not included: uploaded files in Supabase Storage (passport photos, documents) and
              Supabase-managed schemas. For full disaster recovery use Supabase dashboard →
              Database → Backups, and back up storage files separately.
            </p>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Backups contain personal data. Store downloads in an access-controlled location
                and delete old copies.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tables</CardTitle>
          <CardDescription>
            Row counts reflect the live database when this page loaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable className="rounded-none border-0 shadow-none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Columns</TableHead>
                  <TableHead>Row level security</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table.name}>
                    <TableCell className="font-mono text-xs font-medium text-slate-900">
                      {table.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(table.rows)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{table.columns}</TableCell>
                    <TableCell>
                      {table.rls ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}
