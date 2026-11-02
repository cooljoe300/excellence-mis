import {
  fetchSchemaSnapshot,
  type AdminClient,
  type SchemaSnapshot,
  type SchemaTable,
} from '@/lib/database-tools';

/**
 * Builds a portable JSON backup of the application database.
 *
 * The backup is intentionally self-contained: it includes the schema snapshot
 * (so a restored copy knows its structure), every row of every public table,
 * auth account metadata, and the storage bucket list.
 *
 * Not included: storage object contents (passport photos etc.), password
 * hashes (Supabase never exposes them) and Supabase-managed schemas. For a
 * full project backup use Supabase's dashboard backups / pg_dump.
 */

export const BACKUP_FORMAT = 'excellence-mis-backup';
export const BACKUP_FORMAT_VERSION = 1;

const PAGE_SIZE = 1000;
const MAX_PAGES = 5000;

export interface DatabaseBackup {
  format: typeof BACKUP_FORMAT;
  format_version: number;
  generated_at: string;
  application: string;
  database: {
    name: string;
    server_version: string;
  };
  includes: {
    schema: boolean;
    public_tables: boolean;
    auth_users: boolean;
    storage_buckets: boolean;
    storage_files: boolean;
  };
  counts: Record<string, number>;
  total_rows: number;
  errors: Record<string, string>;
  warnings: string[];
  tables: Record<string, Record<string, unknown>[]>;
  auth_users: Record<string, unknown>[];
  storage_buckets: Record<string, unknown>[];
  schema: SchemaSnapshot;
}

async function fetchTableRows(
  admin: AdminClient,
  table: SchemaTable
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let query = admin.from(table.name).select('*');

    // Stable pagination needs a deterministic order; the primary key is the
    // only guaranteed-unique ordering available through PostgREST.
    for (const column of table.primary_key) {
      query = query.order(column, { ascending: true });
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await query.range(from, to);

    if (error) throw new Error(error.message);

    const batch = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) return rows;
  }

  throw new Error(
    `Stopped after ${MAX_PAGES * PAGE_SIZE} rows. Use pg_dump for tables this large.`
  );
}

async function fetchAuthUsers(admin: AdminClient): Promise<Record<string, unknown>[]> {
  const users: Record<string, unknown>[] = [];
  const perPage = 1000;

  for (let page = 1; page <= 200; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const batch = data?.users ?? [];
    for (const user of batch) {
      users.push({
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role,
        aud: user.aud,
        email_confirmed_at: user.email_confirmed_at ?? null,
        phone_confirmed_at: user.phone_confirmed_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
        created_at: user.created_at,
        updated_at: user.updated_at ?? null,
        app_metadata: user.app_metadata ?? null,
        user_metadata: user.user_metadata ?? null,
      });
    }

    if (batch.length < perPage) break;
  }

  return users;
}

async function fetchStorageBuckets(admin: AdminClient): Promise<Record<string, unknown>[]> {
  const { data, error } = await admin.storage.listBuckets();
  if (error) throw new Error(error.message);

  return (data ?? []).map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    public: bucket.public,
    file_size_limit: bucket.file_size_limit ?? null,
    allowed_mime_types: bucket.allowed_mime_types ?? null,
    created_at: bucket.created_at ?? null,
    updated_at: bucket.updated_at ?? null,
  }));
}

function backupFilename(date: Date) {
  return `excellence-mis-backup-${date.toISOString().replace(/[:.]/g, '-')}.json`;
}

export async function buildJsonBackup(
  admin: AdminClient
): Promise<{ backup: DatabaseBackup; filename: string }> {
  const startedAt = new Date();
  const schema = await fetchSchemaSnapshot(admin);

  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  const tables: Record<string, Record<string, unknown>[]> = {};

  for (const table of schema.tables) {
    if (table.primary_key.length === 0) {
      warnings.push(
        `Table "${table.name}" has no primary key; rows may repeat or be skipped if it is modified during the export.`
      );
    }

    try {
      const rows = await fetchTableRows(admin, table);
      tables[table.name] = rows;
      counts[table.name] = rows.length;
    } catch (error) {
      tables[table.name] = [];
      counts[table.name] = 0;
      errors[table.name] = error instanceof Error ? error.message : String(error);
    }
  }

  let authUsers: Record<string, unknown>[] = [];
  try {
    authUsers = await fetchAuthUsers(admin);
  } catch (error) {
    errors.auth_users = error instanceof Error ? error.message : String(error);
  }

  let storageBuckets: Record<string, unknown>[] = [];
  try {
    storageBuckets = await fetchStorageBuckets(admin);
  } catch (error) {
    errors.storage_buckets = error instanceof Error ? error.message : String(error);
  }

  const totalRows = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const backup: DatabaseBackup = {
    format: BACKUP_FORMAT,
    format_version: BACKUP_FORMAT_VERSION,
    generated_at: startedAt.toISOString(),
    application: 'Excellence MIS',
    database: {
      name: schema.database,
      server_version: schema.server_version,
    },
    includes: {
      schema: true,
      public_tables: true,
      auth_users: true,
      storage_buckets: true,
      storage_files: false,
    },
    counts,
    total_rows: totalRows,
    errors,
    warnings,
    tables,
    auth_users: authUsers,
    storage_buckets: storageBuckets,
    schema,
  };

  return { backup, filename: backupFilename(startedAt) };
}
