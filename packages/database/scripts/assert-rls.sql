-- Assert, against a real database, that row level security is actually on.
--
-- `rowLevelSecurity.test.ts` reads the migration SQL from disk. It is green
-- whether or not a migration was ever applied, and it cannot see a policy that
-- was added outside the repo. This asserts the catalog instead: what the
-- database is, not what the migrations say.
--
-- Read-only on purpose. It creates nothing and writes nothing, so the same file
-- is safe to run against production as a drift probe and against an ephemeral
-- database in CI. The grant layer it protects lives only in the Supabase
-- dashboard - no migration in this repo creates a role or a grant - so CI can
-- prove our migrations enable RLS and only a production run can prove the live
-- database still looks like this.
--
-- Every assertion below fails closed and names the tables it found.

DO $$
DECLARE
  examined      int;
  unguarded     text[];
  with_policies text[];
  forced_off    int;
BEGIN
  -- Coverage first. Every check below is a "find the bad ones" query, and each
  -- one returns nothing at all when the schema is empty or misnamed - so
  -- without this the whole file passes loudly while examining zero tables.
  SELECT count(*) INTO examined
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'superadmin' AND c.relkind = 'r';

  IF examined = 0 THEN
    RAISE EXCEPTION
      'RLS guard examined no tables: schema "superadmin" has none. Either the '
      'migrations did not run, or DATABASE_URL points somewhere unexpected. '
      'Refusing to report a pass over an empty set.';
  END IF;

  -- 1. Every table the panel owns has RLS enabled.
  --
  -- `_prisma_migrations` is excluded by name rather than by a pattern: it is
  -- Prisma's bookkeeping, holding migration names and checksums, and it is not
  -- part of the panel's data surface. Naming it means a future exclusion has to
  -- be written down and reviewed rather than silently matched.
  SELECT array_agg(c.relname ORDER BY c.relname) INTO unguarded
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'superadmin'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
    AND c.relname <> '_prisma_migrations';

  IF unguarded IS NOT NULL THEN
    RAISE EXCEPTION
      'Row level security is not enabled on: %. Every table in "superadmin" '
      'needs an ALTER TABLE ... ENABLE ROW LEVEL SECURITY in its migration. '
      'See docs/deploy.md, "Row level security".',
      array_to_string(unguarded, ', ');
  END IF;

  -- 2. No policies.
  --
  -- Deny-by-default is the whole control: RLS with zero policies denies every
  -- non-owner, non-BYPASSRLS role. A single permissive policy - `USING (true)`
  -- is the easy accident - turns the control off again while leaving
  -- `relrowsecurity` true, so a check that only reads that flag cannot see it.
  SELECT array_agg(DISTINCT c.relname ORDER BY c.relname) INTO with_policies
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'superadmin';

  IF with_policies IS NOT NULL THEN
    RAISE EXCEPTION
      'Policies exist on: %. The panel relies on RLS with NO policies, which '
      'denies every non-owner role. Adding one re-opens the tables it covers, '
      'so this needs a deliberate decision and this guard updated with it.',
      array_to_string(with_policies, ', ');
  END IF;

  -- 3. Report what was actually checked, so a passing run is auditable rather
  -- than a bare exit 0.
  SELECT count(*) INTO forced_off
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'superadmin' AND c.relkind = 'r' AND c.relrowsecurity;

  RAISE NOTICE
    'RLS guard passed: % of % tables in "superadmin" have RLS enabled, 0 policies. '
    'Excluded by name: _prisma_migrations.',
    forced_off, examined;
END $$;
