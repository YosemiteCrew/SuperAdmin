# Admin App — Agent Rules

## Stack

- Next.js 15 (App Router, TypeScript strict)
- React 19
- Tailwind CSS 4
- SuperTokens (auth: email/password + sessions + user metadata + multitenancy)
- Jest + React Testing Library + jest-axe (unit tests)

State is local React (`useState` / Server Components / URL params). No client state library.

## Test Coverage Mandate

- ≥ 95% Statements, Branches, Functions, Lines
- Any new file must hit ≥ 90% on first commit
- Test mirror lives at `src/app/__tests__/` (mirrors source path)

## Before Finishing Any Task

1. `pnpm --filter admin run type-check`
2. `pnpm --filter admin run lint`
3. `pnpm --filter admin run test --testPathPatterns="<file>"`

## Directory Conventions

- `src/app/ui/` — UI primitives (no business logic, no API calls)
- `src/app/lib/` — small helpers (logger, reportError, cn)
- `src/app/config/` — env.public, env.server, appInfo, backend, frontend
- `src/app/constants/` — app-level constants (APP_NAME, base paths)
- `src/app/(routes)/` — route groups
- `src/app/api/` — API routes
- `src/app/__tests__/` — test files mirroring source structure

## Commit Scope

Always use `admin` scope: `feat(admin): ...`, `fix(admin): ...`
