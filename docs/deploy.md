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

## Amplify Hosting

The panel is hosted on AWS Amplify at `https://admin.yosemitecrew.com`.
`amplify.yml` at the repo root is the build spec; it pins Node 20 and pnpm 8.15.6
to match CI, installs from the repo root so the workspace links resolve, and
builds `apps/admin`.

**Migrations run in the build, on `main` only.** The build guards on `$AWS_BRANCH`,
so preview and feature-branch builds never touch the live database. This is the
Amplify equivalent of `pnpm run release` below, and it is what prevents a repeat
of the 2026-08-11 outage.

### Environment variables

Set these in Amplify under **App settings > Environment variables**. Everything is
read at build time as well as runtime, and `NEXT_PUBLIC_APP_ORIGIN` in particular
is baked into the bundle, so changing it needs a redeploy.

> **Do not move the credential-bearing ones into App settings > Secrets.** That
> store looks like the obvious home for `DATABASE_URL` and `SUPERTOKENS_API_KEY`,
> and AWS's own environment-variable page tells you not to keep secrets in
> environment variables. It does not work here. Amplify Gen 1 secrets are
> delivered as _"`process.env.secrets` as a JSON string"_ - a single blob, not
> individual variables - so `process.env.DATABASE_URL` stays undefined and the
> build fails exactly as if you had set nothing. It is also a build-phase
> mechanism, so the SSR compute would not see them at runtime either. Nothing in
> this app parses that blob.
>
> Amplify encrypts environment variables at rest, so the real exposure is console
> read access. Control it there, and treat every value below as rotatable.

Required, the app refuses to boot without them:

| Variable                     | Value                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_ORIGIN`     | `https://admin.yosemitecrew.com`                                                                  |
| `SUPERTOKENS_CONNECTION_URI` | the SuperTokens core URI                                                                          |
| `SUPERTOKENS_API_KEY`        | the core API key                                                                                  |
| `DATABASE_URL`               | Postgres. **Session pooler**, and it must end `?schema=superadmin` - see Supabase specifics below |

#### Which ones actually block a build

Only three stop a build, and they stop it at different points, so fix them in this
order:

1. **`DATABASE_URL`** fails first. The `build` phase runs `migrate:deploy` _before_
   `next build`, so an absent value halts everything with `Validation Error
Count: 1` on `url = env("DATABASE_URL")`. A build that dies here never even
   attempted to compile the app.
2. **`SUPERTOKENS_CONNECTION_URI`** and **`SUPERTOKENS_API_KEY`** fail next, while
   Next collects page data - `env.server.ts` throws on module load. The URI has to
   point at a core that is genuinely _reachable_, not merely be set: collecting
   `/api/auth/[[...path]]` opens a connection. Check with
   `curl -o /dev/null -w '%{http_code}' <uri>/hello`, which returns `200` with no
   API key.

`NEXT_PUBLIC_APP_ORIGIN` does not fail the build, but it is baked into the bundle,
so a wrong value ships silently and breaks both OAuth callbacks.

Optional; each one that is absent disables exactly one feature and leaves the
rest of the panel working, so a first deploy can go green with only the three
above: `SUPERADMIN_BOOTSTRAP_EMAILS`, `PLUNK_API_KEY`,
`PLUNK_API_ENDPOINT`, `AP_SIGNING_KEY`, `AP_SIGNING_KEY_ID`, `CONSENT_INTAKE_KEY`,
`CONTACT_INTAKE_KEY`, and the social poster set (`TIKTOK_CLIENT_KEY`,
`TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`, `INSTAGRAM_APP_ID`,
`INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI`, `SOCIAL_TOKEN_KEY`,
`SOCIAL_SCHEDULER_KEY`).

The two OAuth redirect URIs must match what is registered with each provider
character for character, or the callback fails:

- `TIKTOK_REDIRECT_URI` = `https://admin.yosemitecrew.com/api/social/tiktok/callback`
- `INSTAGRAM_REDIRECT_URI` = `https://admin.yosemitecrew.com/api/social/instagram/callback`

### Access control

Amplify branch **password protection** should stay on. It is a coarse gate in
front of everything, sitting ahead of SuperTokens rather than replacing it: the
panel still requires a super-admin account and TOTP. The point is that
unauthenticated internet traffic never reaches application code.

Note this gate also covers `/api/social/*/scheduled`, which is server-to-server.
Run the scheduler so it does not cross the public internet, or give it whatever
credential the gate expects.

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

Two independent constraints decide which connection string to use, and picking
for only one of them gets you a broken deploy.

**Migrations need a session-level connection.** `prisma migrate deploy` takes a
session-level advisory lock. The **transaction** pooler (port **6543**) does not
hold session state, so the migration hangs or fails there. Never use it for
`DATABASE_URL`.

**Amplify builds run on IPv4.** Supabase's direct connection
(`db.<ref>.supabase.co`, port 5432) is **IPv6-only** unless the paid dedicated
IPv4 add-on is enabled, so a build container generally cannot reach it at all.

| Connection               | Migration-safe               | Reachable from Amplify    | Use it?                             |
| ------------------------ | ---------------------------- | ------------------------- | ----------------------------------- |
| Transaction pooler, 6543 | No, breaks the advisory lock | Yes                       | **No**                              |
| Direct, 5432             | Yes                          | Only with the IPv4 add-on | Only if that add-on is on           |
| **Session pooler**       | Yes, session mode            | Yes                       | **Yes, this is the default choice** |

Supabase labels the session pooler "only recommended as an alternative to direct
connection when connecting via an IPv4 network", which is exactly what an Amplify
build is. Find all three under **Database > Settings > Connect**.

For `yosemitecrew-production` the session pooler parameters are host
`aws-1-eu-central-1.pooler.supabase.com`, port `5432`, database `postgres`, user
`postgres.<project-ref>`. Note the host prefix is `aws-1-`; older Supabase docs
show `aws-0-`, and copying that gives a hostname that does not resolve.

While you are on that page, confirm **Network restrictions** still reads "Your
database can be accessed by all IP addresses". Amplify build containers have no
stable egress IP, so any allowlist there fails the build with a connection
timeout that looks nothing like a permissions problem.

**The database password is not retrievable.** Supabase shows it once at creation.
The connection dialog only ever renders `[YOUR-PASSWORD]` as a placeholder.
Resetting it is not free: the same database backs other services, so a reset
breaks every existing connection, not just the panel's. Recover the stored value
rather than resetting unless you have accounted for the other consumers.

If the password contains special characters, percent-encode it in the URI.

Run migrations from inside `packages/database`. Invoking `npx prisma` elsewhere
pulls Prisma **7** off the registry against this Prisma **6** project.

## The panel must own a Postgres schema

**`DATABASE_URL` has to end `?schema=superadmin`.** Without it the panel targets
`public`, which it shares with the main Yosemite-Crew API, and the first
`migrate deploy` half-applies and then wedges. This is not a precaution; it was
reproduced against a copy of production.

`public` on `yosemitecrew-production` already contains a `ContactRequest` table
that is **not ours**: 17 columns, `type` and `source` as enums, a `userId`. The
panel's model has 9 fields and none of those. Same name, different table,
different owner. `public._prisma_migrations` likewise holds 100+ rows belonging
to the API, and none of the panel's five.

Prisma applies in lexicographic order, so `..._add_consent_ledger` runs before
`..._add_contact_leads`. Pointed at `public`, `migrate deploy` does this:

```
Applying migration `20260630_add_ap_license_token`      <- created on the shared DB
Applying migration `20260703_add_consent_ledger`        <- created on the shared DB
Applying migration `20260703_add_contact_leads`
Error: P3018 ... Database error code: 42P07
ERROR: relation "ContactRequest" already exists
```

Three tables are now on the shared database, and the failed migration is left
with `finished_at = NULL`. Every later deploy then dies before doing anything:

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not
be applied.
```

Recovering that needs a manual `migrate resolve` against production.

With `?schema=superadmin` the same database takes all five migrations cleanly.
Prisma **creates the schema itself** - it does not have to exist first - and puts
its own `_prisma_migrations` inside it, so the two projects stop sharing a ledger
and stop sharing a namespace. `public` is left byte-identical: the API's
`ContactRequest` keeps its 17 columns and its rows, and its ledger keeps exactly
its own rows. Prisma Client honours the same parameter, so reads and writes at
runtime land in `superadmin` too.

One caveat that is worth thirty seconds before the first build. Prisma implements
`?schema=` by setting `search_path` on the connection, which survives a **session**
pooler but not a transaction pooler - another reason `DATABASE_URL` must be the
session pooler. Confirm it end to end against the real pooler with:

```bash
psql "$DATABASE_URL" -c 'show search_path;'
```

It should name `superadmin`. If it says `public`, stop: the parameter is being
dropped and a deploy would land in the shared schema.

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
