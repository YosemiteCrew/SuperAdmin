-- Enable row level security on every table this panel owns.
--
-- Nothing reaches these tables through the REST roles today. That was measured,
-- not assumed: `anon` and `authenticated` have no USAGE on this schema, and
-- `information_schema.role_table_grants` returns zero rows for them on every
-- table in it. So RLS is not what keeps this data private right now, and that
-- is precisely the problem. One GRANT, or one schema added to the exposed API
-- list, and a marketing lead list, a consent ledger and a register of GDPR
-- data-subject requests are published with no second control behind them.
--
-- Enabling RLS with no policies denies by default: a role that is neither the
-- table owner nor BYPASSRLS reads nothing. The migration and application
-- connection owns these tables, so its access is unchanged -- which is what
-- makes this safe to apply to a live panel, and also what to revisit if the app
-- is ever moved to a least-privilege role. That role would need explicit
-- policies, and would get zero rows until it had them.
--
-- Why this was ever off: the project-level guard that normally does it is an
-- event trigger scoped to the `public` schema, and every table below is created
-- in the panel's own schema, so it has never once fired here. One guard aimed at
-- the wrong schema, not seven separate oversights. The durable fix is repo-side:
-- `apps/admin/src/app/__tests__/database/rowLevelSecurity.test.ts` fails if a
-- Prisma model is added without a matching statement in a migration.

ALTER TABLE "APDirectoryListing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "APLicenseToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactLead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataRequest" ENABLE ROW LEVEL SECURITY;
