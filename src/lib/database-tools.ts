import type { createAdminClient } from '@/lib/supabase/admin';

/**
 * Shared types and helpers for the admin database tools (backup + schema
 * extraction). Everything here runs with the service-role client on the
 * server only; the underlying RPCs are granted to service_role exclusively.
 */

export type AdminClient = ReturnType<typeof createAdminClient>;

export const DATABASE_TOOLS_SETUP_HINT =
  'Database tools are not installed yet. Run supabase/migrations/059_database_tools.sql in the Supabase SQL Editor, then reload this page.';

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  generation_expression: string | null;
  identity: '' | 'a' | 'd';
  generated: '' | 's';
  position: number;
  comment: string | null;
}

export interface SchemaConstraint {
  name: string;
  type: string;
  definition: string;
}

export interface SchemaIndex {
  name: string;
  definition: string;
  constraint_owned: boolean;
}

export interface SchemaTrigger {
  name: string;
  definition: string;
  enabled: 'O' | 'D' | 'R' | 'A';
}

export interface SchemaPolicy {
  name: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  permissive: boolean;
  roles: string[];
  using: string | null;
  with_check: string | null;
}

export interface SchemaTable {
  schema: string;
  name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  row_estimate: number;
  comment: string | null;
  primary_key: string[];
  columns: SchemaColumn[];
  constraints: SchemaConstraint[];
  indexes: SchemaIndex[];
  triggers: SchemaTrigger[];
  policies: SchemaPolicy[];
}

export interface SchemaView {
  name: string;
  kind: 'view' | 'materialized_view';
  definition: string;
  options: string[] | null;
}

export interface SchemaFunction {
  name: string;
  arguments: string;
  kind: 'f' | 'p';
  definition: string;
}

export interface SchemaEnum {
  name: string;
  values: string[];
}

export interface SchemaSequence {
  name: string;
  identity_owned: boolean;
}

export interface SchemaExtension {
  name: string;
  version: string;
  schema: string;
}

export interface SchemaSnapshot {
  generated_at: string;
  database: string;
  server_version: string;
  tables: SchemaTable[];
  views: SchemaView[];
  functions: SchemaFunction[];
  enums: SchemaEnum[];
  sequences: SchemaSequence[];
  extensions: SchemaExtension[];
}

export interface TableCount {
  table_name: string;
  row_count: number;
}

function isMissingFunctionError(error: {
  code?: string;
  message?: string;
} | null | undefined) {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    /could not find the function|function .* does not exist/i.test(error.message ?? '')
  );
}

export async function fetchSchemaSnapshot(admin: AdminClient): Promise<SchemaSnapshot> {
  const { data, error } = await admin.rpc('get_schema_snapshot');

  if (error) {
    if (isMissingFunctionError(error)) throw new Error(DATABASE_TOOLS_SETUP_HINT);
    throw new Error(`Could not read the database schema: ${error.message}`);
  }

  return data as unknown as SchemaSnapshot;
}

export async function fetchTableCounts(admin: AdminClient): Promise<TableCount[]> {
  const { data, error } = await admin.rpc('get_public_table_counts');

  if (error) {
    if (isMissingFunctionError(error)) return [];
    throw new Error(`Could not count table rows: ${error.message}`);
  }

  return ((data ?? []) as unknown as TableCount[]).map((row) => ({
    table_name: row.table_name,
    row_count: Number(row.row_count ?? 0),
  }));
}

/* -------------------------------------------------------------------------- */
/* DDL generation                                                             */
/* -------------------------------------------------------------------------- */

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function withSemicolon(statement: string) {
  const trimmed = statement.trim();
  return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
}

/**
 * Turns the schema snapshot into a readable SQL file. It is a DDL extraction,
 * not a pg_dump replacement: owners, grants and the Supabase-managed
 * auth/storage schemas are intentionally out of scope.
 */
export function buildSchemaSql(snapshot: SchemaSnapshot): string {
  const lines: string[] = [];
  const push = (...values: string[]) => lines.push(...values);

  push(
    `-- Schema extraction: ${snapshot.database}`,
    `-- PostgreSQL ${snapshot.server_version}`,
    `-- Generated: ${snapshot.generated_at}`,
    '--',
    '-- This file contains DDL for the public schema only (tables, constraints,',
    '-- indexes, functions, triggers, views, enums, sequences, RLS policies).',
    '-- Data is not included; use the JSON backup for table data.',
    '-- Object owners and GRANT statements are not included.',
    '',
    'SET check_function_bodies = false;',
    'SET client_min_messages = warning;',
    'SET search_path = public, extensions;',
    ''
  );

  if (snapshot.extensions.length > 0) {
    push('-- Extensions');
    const schemas = [...new Set(snapshot.extensions.map((extension) => extension.schema))].sort();
    for (const schema of schemas) {
      if (schema !== 'public') push(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)};`);
    }
    for (const extension of snapshot.extensions) {
      push(
        `CREATE EXTENSION IF NOT EXISTS ${quoteIdent(extension.name)} WITH SCHEMA ${quoteIdent(extension.schema)};`
      );
    }
    push('');
  }

  if (snapshot.enums.length > 0) {
    push('-- Enums');
    for (const enumType of snapshot.enums) {
      const values = enumType.values.map(quoteLiteral).join(', ');
      push(`CREATE TYPE public.${quoteIdent(enumType.name)} AS ENUM (${values});`);
    }
    push('');
  }

  const standaloneSequences = snapshot.sequences.filter((sequence) => !sequence.identity_owned);
  if (standaloneSequences.length > 0) {
    push('-- Sequences');
    for (const sequence of standaloneSequences) {
      push(`CREATE SEQUENCE IF NOT EXISTS public.${quoteIdent(sequence.name)};`);
    }
    push('');
  }

  push('-- Tables');
  for (const table of snapshot.tables) {
    push(`CREATE TABLE IF NOT EXISTS public.${quoteIdent(table.name)} (`);

    const definitions: string[] = [];
    for (const column of table.columns) {
      let definition = `  ${quoteIdent(column.name)} ${column.type}`;

      if (column.generated === 's' && column.generation_expression) {
        definition += ` GENERATED ALWAYS AS (${column.generation_expression}) STORED`;
      } else if (column.identity === 'a') {
        definition += ' GENERATED ALWAYS AS IDENTITY';
      } else if (column.identity === 'd') {
        definition += ' GENERATED BY DEFAULT AS IDENTITY';
      } else if (column.default) {
        definition += ` DEFAULT ${column.default}`;
      }

      if (!column.nullable) definition += ' NOT NULL';

      definitions.push(definition);
    }

    for (const constraint of table.constraints) {
      definitions.push(
        `  CONSTRAINT ${quoteIdent(constraint.name)} ${constraint.definition}`
      );
    }

    push(definitions.join(',\n'));
    push(');');

    if (table.comment) {
      push(`COMMENT ON TABLE public.${quoteIdent(table.name)} IS ${quoteLiteral(table.comment)};`);
    }

    for (const column of table.columns) {
      if (column.comment) {
        push(
          `COMMENT ON COLUMN public.${quoteIdent(table.name)}.${quoteIdent(column.name)} IS ${quoteLiteral(column.comment)};`
        );
      }
    }

    if (table.rls_enabled) {
      push(`ALTER TABLE public.${quoteIdent(table.name)} ENABLE ROW LEVEL SECURITY;`);
    }
    if (table.rls_forced) {
      push(`ALTER TABLE public.${quoteIdent(table.name)} FORCE ROW LEVEL SECURITY;`);
    }

    push('');
  }

  const indexes = snapshot.tables.flatMap((table) =>
    table.indexes
      .filter((index) => !index.constraint_owned)
      .map((index) => index.definition)
  );
  if (indexes.length > 0) {
    push('-- Indexes');
    for (const index of indexes) push(withSemicolon(index));
    push('');
  }

  if (snapshot.functions.length > 0) {
    push('-- Functions and procedures');
    for (const fn of snapshot.functions) {
      push(`-- ${fn.name}(${fn.arguments})`);
      push(withSemicolon(fn.definition));
      push('');
    }
  }

  const triggers = snapshot.tables.flatMap((table) =>
    table.triggers.map((trigger) => ({ table, trigger }))
  );
  if (triggers.length > 0) {
    push('-- Triggers');
    for (const { table, trigger } of triggers) {
      push(withSemicolon(trigger.definition));
      if (trigger.enabled === 'D') {
        push(
          `ALTER TABLE public.${quoteIdent(table.name)} DISABLE TRIGGER ${quoteIdent(trigger.name)};`
        );
      }
    }
    push('');
  }

  if (snapshot.views.length > 0) {
    push('-- Views (create these last; view dependencies are not ordered)');
    for (const view of snapshot.views) {
      const options = (view.options ?? [])
        .map((option) => option.replace(/=/, ' = '))
        .join(', ');
      const optionsClause = options ? ` WITH (${options})` : '';
      const definition = view.definition.trim().replace(/;$/, '');

      if (view.kind === 'materialized_view') {
        push(
          `CREATE MATERIALIZED VIEW IF NOT EXISTS public.${quoteIdent(view.name)}${optionsClause} AS\n${definition}\nWITH DATA;`
        );
      } else {
        push(
          `CREATE OR REPLACE VIEW public.${quoteIdent(view.name)}${optionsClause} AS\n${definition};`
        );
      }
      push('');
    }
  }

  const policies = snapshot.tables.flatMap((table) =>
    table.policies.map((policy) => ({ table, policy }))
  );
  if (policies.length > 0) {
    push('-- Row level security policies');
    for (const { table, policy } of policies) {
      const permissive = policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE';
      const roles =
        policy.roles.length > 0
          ? ` TO ${policy.roles.map(quoteIdent).join(', ')}`
          : '';

      let statement = `CREATE POLICY ${quoteIdent(policy.name)} ON public.${quoteIdent(
        table.name
      )} AS ${permissive} FOR ${policy.command}${roles}`;

      if (policy.using) statement += ` USING (${policy.using})`;
      if (policy.with_check) statement += ` WITH CHECK (${policy.with_check})`;

      push(`${statement};`);
    }
    push('');
  }

  return lines.join('\n');
}
