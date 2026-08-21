# Deploying the Superadmin panel

## The one rule

Run `pnpm run release`, not `pnpm run build`.

```bash
pnpm install --frozen-lockfile
pnpm run release        # migrate:deploy, then build
pnpm run start
```

`release` runs `prisma migrate deploy` and only builds if it succeeds. Building
without it ships code against an older schema, which is not a hypothetical: on
2026-08-11 a migration adding `ContactLead.phone` was merged and deployed while
the production database never received it. `/crm/requests` served the error
boundary with `P2022 The column ContactLead.phone does not exist`, and every
public contact-form submission 500'd and was **lost, not queued**, for the whole
window. Nothing in this repo auto-migrates, so a build-only deploy will do it
again.

## Before the first migrate on an unfamiliar database

`prisma migrate status` misreports on a database with no migration history, so
triage with SQL instead. Both answers change what you should do:

```sql
SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS has_history;
SELECT migration_name, finished_at IS NOT NULL AS ok
FROM _prisma_migrations ORDER BY started_at;
```

- **A row with `ok = f`** - a previous deploy died partway. Resolve it before
  deploying again, or you get `P3009`:
  `pnpm --filter @superadmin/database exec prisma migrate resolve --rolled-back <migration_name>`
- **`has_history = f`** - the schema was built by `db push` or restored from a
  dump. Do **not** run `migrate deploy`: it starts from migration #1, tries to
  recreate tables that already exist, and wedges the ledger. Baseline first.
- An **empty but present** `_prisma_migrations` table is more dangerous than an
  absent one, because it does not raise `P3005` - deploy charges straight into
  migration #1.

## Supabase specifics

Use the **direct** connection (`db.<ref>.supabase.co`, port **5432**) for
migrations. The transaction pooler on **6543** breaks Prisma's session-level
advisory lock and the migration hangs or fails.

Run it from inside `packages/database`. Invoking `npx prisma` elsewhere pulls
Prisma **7** off the registry against this Prisma **6** project.

## Repairing a schema that drifted

If a column was applied by hand, the ledger still needs the row or the next
`migrate deploy` dies with `column ... already exists`. Do both in one
transaction. The checksum is the SHA-256 of that migration's `migration.sql` -
verify it rather than copying one from memory:

```bash
shasum -a 256 packages/database/prisma/migrations/<name>/migration.sql
```

```sql
BEGIN;
ALTER TABLE "ContactLead" ADD COLUMN IF NOT EXISTS "phone" TEXT;
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT gen_random_uuid()::text,
       '49242c95660c2137e9162587e99870aefe18961ebca1914813dce0a34be37d17',
       now(), '20260811_add_contact_lead_phone', NULL, NULL, now(), 1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260811_add_contact_lead_phone'
);
COMMIT;
```

Re-running is a no-op. Afterwards `migrate deploy` should report **No pending
migrations to apply**.

## Environment

`apps/admin/.env.example` is the list. `SUPERTOKENS_CONNECTION_URI`,
`SUPERTOKENS_API_KEY` and `DATABASE_URL` are required and the app refuses to boot
without them, naming the missing one. Everything else is optional and degrades a
single feature rather than the panel: the Social page, for instance, reports
exactly which of its variables are unset and leaves the rest of the panel working.
