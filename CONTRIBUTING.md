# Contributing

## Setup

```bash
pnpm install
```

## Architecture Decisions

Decisions that would be expensive to reverse (persistence/storage trade-offs, auth model choices, accepted consistency limitations) are recorded in [docs/adr/](./docs/adr/README.md).

## Commit Format

All commits must follow Conventional Commits:

```
type(scope): subject
```

**Allowed types:** `build` | `chore` | `ci` | `docs` | `feat` | `fix` | `perf` | `refactor` | `revert` | `style` | `test`

**Allowed scopes:** `admin` | `types` | `repo` | `ci` | `docs`

## Before Submitting a PR

```bash
pnpm run lint
pnpm run type-check
pnpm run test --filter admin -- --testPathPattern="<file>"
```

Coverage must remain ≥ 95% on all touched files.

## Branch Naming

```
feat/admin-user-management
fix/admin-pagination-bug
chore/repo-husky-update
```
