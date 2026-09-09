# Superadmin Panel

A production-quality, auth-first admin dashboard built on Next.js 16 (App Router) and SuperTokens.

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript strict)
- **Auth:** SuperTokens (EmailPassword + TOTP MFA)
- **Authorization:** a single `superadmin` role, checked directly - no multi-role RBAC recipe or
  tenant plugin yet (see `apps/admin/AGENTS.md`)
- **Styling:** Tailwind CSS 4
- **State:** local React state - no client state library
- **Tests:** Jest + React Testing Library (≥95% coverage), Playwright (E2E)
- **Monorepo:** pnpm workspaces + Turborepo
- **Database:** Postgres via `@superadmin/database` (Prisma, RLS-enforced)

## Getting Started

Copy `apps/admin/.env.example` to `apps/admin/.env.local` and fill in `SUPERTOKENS_CONNECTION_URI`,
`SUPERTOKENS_API_KEY`, and `DATABASE_URL` first - the app throws on boot without them. For a local
SuperTokens core + Postgres, `docker-compose.dev.yml` at the repo root starts both.

```bash
pnpm install
pnpm dev
```

## Apps & Packages

| Path                | Description                                    |
| ------------------- | ----------------------------------------------- |
| `apps/admin`        | Next.js superadmin dashboard                   |
| `packages/types`    | Shared TypeScript domain types                 |
| `packages/database` | Prisma schema, migrations, RLS policies (Postgres) |

## Documentation

- [`HANDOVER.md`](./HANDOVER.md) - architecture, conventions, the quality gate, and the open
  backlog. Start here.
- [`docs/adr/`](./docs/adr/) - architecture decision records.
- [`docs/deploy.md`](./docs/deploy.md) - deployment.
- [`apps/admin/SMOKE-TESTS.md`](./apps/admin/SMOKE-TESTS.md) - manual smoke-test checklist.

## Scripts

```bash
pnpm build          # Build all packages
pnpm dev            # Start dev servers
pnpm lint           # Lint all packages
pnpm type-check     # TypeScript check all packages
pnpm test           # Run tests (use --filter for scoped runs)
pnpm format         # Prettier format
pnpm verify         # Full pre-merge gate: lint + type-check + test + build
```
