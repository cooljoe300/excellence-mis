-- Database tools: schema snapshot + exact row counts
--
-- PostgREST only exposes tables/views in the public schema, so the admin UI
-- cannot read pg_catalog directly. These two SECURITY DEFINER functions give
-- the server-side admin client (service_role) everything needed to:
--   * render a database overview (tables, columns, RLS, policies)
--   * export the full schema as SQL DDL
--   * verify row counts before a backup
--
-- Both functions are locked down: PUBLIC/anon/authenticated get no EXECUTE.
-- Only service_role (used exclusively in server code) can call them.

CREATE OR REPLACE FUNCTION public.get_schema_snapshot()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'database', current_database(),
    'server_version', current_setting('server_version'),
    'tables', (
      SELECT COALESCE(jsonb_agg(tbl ORDER BY tbl->>'name'), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'schema', n.nspname,
          'name', c.relname,
          'rls_enabled', c.relrowsecurity,
          'rls_forced', c.relforcerowsecurity,
          'row_estimate', GREATEST(c.reltuples, 0)::bigint,
          'comment', obj_description(c.oid, 'pg_class'),
          'primary_key', (
            SELECT COALESCE(jsonb_agg(a.attname ORDER BY s.i), '[]'::jsonb)
            FROM pg_constraint con
            CROSS JOIN LATERAL generate_subscripts(con.conkey, 1) AS s(i)
            JOIN pg_attribute a
              ON a.attrelid = con.conrelid
             AND a.attnum = con.conkey[s.i]
            WHERE con.conrelid = c.oid
              AND con.contype = 'p'
          ),
          'columns', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'name', a.attname,
              'type', format_type(a.atttypid, a.atttypmod),
              'nullable', NOT a.attnotnull,
              'default', CASE
                WHEN a.attgenerated = '' THEN pg_get_expr(d.adbin, d.adrelid)
                ELSE NULL
              END,
              'generation_expression', CASE
                WHEN a.attgenerated <> '' THEN pg_get_expr(d.adbin, d.adrelid)
                ELSE NULL
              END,
              'identity', a.attidentity,
              'generated', a.attgenerated,
              'position', a.attnum,
              'comment', col_description(c.oid, a.attnum)
            ) ORDER BY a.attnum), '[]'::jsonb)
            FROM pg_attribute a
            LEFT JOIN pg_attrdef d
              ON d.adrelid = c.oid
             AND d.adnum = a.attnum
            WHERE a.attrelid = c.oid
              AND a.attnum > 0
              AND NOT a.attisdropped
          ),
          'constraints', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'name', con.conname,
              'type', con.contype,
              'definition', pg_get_constraintdef(con.oid)
            ) ORDER BY con.contype, con.conname), '[]'::jsonb)
            FROM pg_constraint con
            WHERE con.conrelid = c.oid
          ),
          'indexes', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'name', ic.relname,
              'definition', pg_get_indexdef(i.indexrelid),
              'constraint_owned', EXISTS (
                SELECT 1
                FROM pg_constraint con
                WHERE con.conindid = i.indexrelid
              )
            ) ORDER BY ic.relname), '[]'::jsonb)
            FROM pg_index i
            JOIN pg_class ic ON ic.oid = i.indexrelid
            WHERE i.indrelid = c.oid
          ),
          'triggers', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'name', tr.tgname,
              'definition', pg_get_triggerdef(tr.oid),
              'enabled', tr.tgenabled
            ) ORDER BY tr.tgname), '[]'::jsonb)
            FROM pg_trigger tr
            WHERE tr.tgrelid = c.oid
              AND NOT tr.tgisinternal
          ),
          'policies', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'name', p.polname,
              'command', CASE p.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                ELSE 'ALL'
              END,
              'permissive', p.polpermissive,
              'roles', (
                SELECT COALESCE(jsonb_agg(r.rolname ORDER BY r.rolname), '[]'::jsonb)
                FROM pg_roles r
                WHERE r.oid = ANY(p.polroles)
              ),
              'using', pg_get_expr(p.polqual, p.polrelid),
              'with_check', pg_get_expr(p.polwithcheck, p.polrelid)
            ) ORDER BY p.polname), '[]'::jsonb)
            FROM pg_policy p
            WHERE p.polrelid = c.oid
          )
        ) AS tbl
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
      ) s
    ),
    'views', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', c.relname,
        'kind', CASE c.relkind WHEN 'v' THEN 'view' ELSE 'materialized_view' END,
        'definition', pg_get_viewdef(c.oid, true),
        'options', to_jsonb(c.reloptions)
      ) ORDER BY c.relname), '[]'::jsonb)
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('v', 'm')
    ),
    'functions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', p.proname,
        'arguments', pg_get_function_identity_arguments(p.oid),
        'kind', p.prokind,
        'definition', pg_get_functiondef(p.oid)
      ) ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::jsonb)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind IN ('f', 'p')
    ),
    'enums', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', t.typname,
        'values', (
          SELECT COALESCE(jsonb_agg(e.enumlabel ORDER BY e.enumsortorder), '[]'::jsonb)
          FROM pg_enum e
          WHERE e.enumtypid = t.oid
        )
      ) ORDER BY t.typname), '[]'::jsonb)
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typtype = 'e'
    ),
    'sequences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', c.relname,
        'identity_owned', EXISTS (
          SELECT 1
          FROM pg_depend d
          WHERE d.objid = c.oid
            AND d.deptype = 'i'
        )
      ) ORDER BY c.relname), '[]'::jsonb)
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'S'
    ),
    'extensions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', e.extname,
        'version', e.extversion,
        'schema', n.nspname
      ) ORDER BY e.extname), '[]'::jsonb)
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
    )
  );
$function$;

COMMENT ON FUNCTION public.get_schema_snapshot() IS
  'Returns a JSON snapshot of the public schema (tables, columns, constraints, indexes, triggers, RLS policies, views, functions, enums, sequences, extensions) for the admin database tools.';

CREATE OR REPLACE FUNCTION public.get_public_table_counts()
RETURNS TABLE (table_name TEXT, row_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  r RECORD;
  v_count BIGINT;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.relname) INTO v_count;
    table_name := r.relname;
    row_count := v_count;
    RETURN NEXT;
  END LOOP;
END;
$function$;

COMMENT ON FUNCTION public.get_public_table_counts() IS
  'Returns exact row counts for every table in the public schema. Used by the admin database overview and backup verification.';

REVOKE ALL ON FUNCTION public.get_schema_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_table_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_schema_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_table_counts() TO service_role;

-- Verification: both calls should succeed when run as the service_role.
-- SELECT jsonb_array_length(public.get_schema_snapshot() -> 'tables') AS table_count;
-- SELECT count(*) FROM public.get_public_table_counts();
