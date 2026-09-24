# SuperAdmin Engineering Handover

This is the stable map for a new contributor. It deliberately avoids branch, pull-request,
dependency, and backlog snapshots because those go stale. Read the maintained sources below before
changing the repository:

1. `AGENTS.md`, `CLAUDE.md`, and `apps/admin/AGENTS.md` for working rules.
2. `README.md` for setup and the current workspace list.
3. `docs/deploy.md` for deployment, database, and environment requirements.
4. `apps/admin/SMOKE-TESTS.md` for live checks.
5. [Open GitHub issues](https://github.com/YosemiteCrew/SuperAdmin/issues) for current work.

The rule files win if this document conflicts with them.

## Repository

SuperAdmin is the auth-gated operator panel for Yosemite Crew. It is a pnpm/Turbo monorepo using
Next.js 16, React 19, TypeScript, Tailwind CSS 4, SuperTokens, and Postgres.

- `apps/admin` — the Next.js application.
- `packages/types` — shared TypeScript domain types.
- `packages/database` — Prisma schema, migrations, generated client, and RLS controls.
- `packages/database/prisma/schema.prisma` — the database model.
- `docker-compose.dev.yml` — local Postgres and SuperTokens services.
- `pnpm-workspace.yaml`, `turbo.json`, and `package.json` — workspace commands and boundaries.

## Important boundaries

- `apps/admin/src/app/config/backend.ts` initializes SuperTokens and contains the authoritative
  super-admin session, role, MFA, and disabled-account checks.
- `apps/admin/src/proxy.ts` adds the enforced nonce CSP, Basic Auth layer, and navigation redirects.
  Its token decode only controls redirects; it is not an authorization boundary.
- `apps/admin/src/securityHeaders.ts` builds the enforced CSP attached by the proxy.
- `apps/admin/src/app/config/env.server.ts` owns server-side environment validation.
- `apps/admin/src/app/features/audit/store.ts` writes the durable audit store described by
  `docs/adr/0002-durable-audit-store.md`.
- `apps/admin/src/app/features/organizations/corroboration.ts` contains the SSRF-resistant website
  corroboration path.
- `apps/admin/jest.config.mjs` and `apps/admin/sonar-project.properties` must keep coverage
  exclusions aligned. The SonarCloud project key is `YosemiteCrew_Super-Admin`.

## Quality gate

Run these from the repository root. The targeted-test wrapper requires `--testPathPatterns`
directly; do not insert a standalone `--`, and do not use Jest 29's singular flag.

```bash
pnpm --filter admin run type-check
pnpm --filter admin run lint
pnpm --filter admin run test --testPathPatterns="src/app/__tests__/repo/handoverPaths.test.ts"
pnpm --filter admin run test:ci
pnpm exec prettier --check HANDOVER.md docs/deploy.md apps/admin/src/app/__tests__/repo/handoverPaths.test.ts
```

Use targeted tests while iterating and the full suite before opening or updating a pull request.
New files need at least 90% coverage; changed code must keep the repository's 95% coverage floor.
`apps/admin/scripts/run-jest.mjs` enforces the targeted-test rule. Local Sonar is run by
`apps/admin/scripts/sonar.mjs`; it requires the configured local token and must use PR mode for a
pull request. CI performs the production build with its required environment.

## Deployment and environment

`docs/deploy.md` is the source of truth. Deploy with the release path so migrations run before the
build. The complete variable list lives in `apps/admin/.env.example`; required server variables are
validated by `apps/admin/src/app/config/env.server.ts`. Do not duplicate that list here.

The panel's data belongs in its dedicated database and the `superadmin` schema. Preserve the
session-pooler and `?schema=superadmin` requirements documented in `docs/deploy.md`. Every new table
must receive RLS in its migration; `apps/admin/src/app/__tests__/database/rowLevelSecurity.test.ts`
enforces that contract.

## Git and pull requests

Follow `CLAUDE.md` and `AGENTS.md`: work in a task branch/worktree, commit each logical batch with
the configured author, use an allowed conventional-commit scope, and never bypass hooks. Pull
requests target `main`, require the repository's checks and an independent approval, and use
`.github/PULL_REQUEST_TEMPLATE.md`.

Build issue and pull-request descriptions from the actual diff. Do not put temporary branch names,
PR states, coverage snapshots, or copied backlog tables into this file; link to their maintained
source instead.
