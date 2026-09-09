# Monorepo Agent Guide — Superadmin Panel

## Workspaces

- `apps/admin` — Next.js 16 superadmin dashboard
- `packages/types` — Shared TypeScript types

## Per-App Instructions

See `apps/admin/AGENTS.md` for frontend-specific rules.

## Package Manager

Use `pnpm`. Always scope with `--filter`. Never run bare `pnpm install` in an app directory — run from root.

## Task Runner

`turbo run <task> --filter=admin` for scoped tasks.

## Commit Scopes

`admin` | `types` | `repo` | `ci` | `docs`
