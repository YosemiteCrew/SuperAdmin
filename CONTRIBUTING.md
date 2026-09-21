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
pnpm --filter admin run test --testPathPatterns="<file>"
```

Coverage must remain ≥ 95% on all touched files.

## Repository Tooling Gotchas

- Keep the Postgres settings in `docker-compose.dev.yml` as discrete host, port, user, password,
  and database variables. A connection-string literal has a credential-in-URL shape that the
  repository's Secretlint rules correctly reject.
- Pass staged Next.js dynamic-route paths such as `[[...path]]` to Secretlint quoted but otherwise
  unchanged. Secretlint 13 accepts the literal brackets; escaping them makes the tool report that
  the target file was not found. Older guidance to escape these paths is obsolete, and excluding
  bracket paths would leave server route files unscanned.

## Branch Naming

```
feat/admin-user-management
fix/admin-pagination-bug
chore/repo-husky-update
```
