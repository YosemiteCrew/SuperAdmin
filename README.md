# Superadmin Panel

A production-quality, auth-first admin dashboard built on Next.js 15 (App Router), SuperTokens, RBAC, and multi-tenancy.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript strict)
- **Auth:** SuperTokens (EmailPassword + TOTP MFA)
- **RBAC:** SuperTokens UserRoles recipe + Tenant Management Plugin
- **Styling:** Tailwind CSS 4
- **State:** Zustand
- **Tests:** Jest + React Testing Library (≥95% coverage), Playwright (E2E)
- **Monorepo:** pnpm workspaces + Turborepo

## Getting Started

```bash
pnpm install
pnpm dev
```

## Apps & Packages

| Path             | Description                    |
| ---------------- | ------------------------------ |
| `apps/admin`     | Next.js superadmin dashboard   |
| `packages/types` | Shared TypeScript domain types |

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
