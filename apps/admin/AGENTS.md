# Admin App — Agent Rules

## Stack

- Next.js 16 (App Router, TypeScript strict)
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

## Local Build and Development Gotchas

- `next build` sets `NODE_ENV=production` even for a local or CI build. Consequently,
  `src/app/config/env.public.ts` must still accept loopback HTTP origins while rejecting HTTP for
  every deployed origin; otherwise a local production build cannot use its normal localhost URL.
- After changing `src/proxy.ts` or `src/securityHeaders.ts`, a stale `.next` cache can fail with an
  `ENOENT` for an `edge/chunks/*.js` file. Run `pnpm --filter admin run dev:clean` to discard the
  generated cache before investigating the application code.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
