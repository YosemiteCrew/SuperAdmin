# Claude Code Agent Instructions — Superadmin Panel

This file is auto-loaded by Claude Code on every session. All rules here are **mandatory**.

## Skills Index

| Skill                             | When to use                                    |
| --------------------------------- | ---------------------------------------------- |
| `.claude/skills/frontend-design`  | UI work, new components, styling in apps/admin |
| `.claude/skills/frontend-sonar`   | SonarQube fixes or writing Sonar-clean code    |
| `.claude/skills/frontend-testing` | Writing/fixing/running tests in apps/admin     |
| `.claude/skills/code-review`      | Reviewing code or auditing a PR                |

---

## Monorepo Layout

```
apps/
  admin/       — Next.js superadmin panel (primary)
packages/
  types/       — Shared TypeScript types
```

Tooling: `pnpm` workspaces + `turbo`. Always use `--filter` to scope commands.

---

## Mandatory Checks Before Finishing A Frontend Task

```bash
# 1. Type check (120s timeout)
npx tsc --noemit

# 2. Lint
pnpm --filter admin run lint

# 3. Tests — TARGETED ONLY
pnpm --filter admin run test -- --testPathPattern="<relevant-file>"
```

**Full test suite runs are forbidden.** Always target the test file(s) related to what you changed.

**Coverage mandate:** ≥ 95% Statements, Branches, Functions, Lines. Any file you touch must finish equal or higher. New files must hit ≥ 90% on first commit.

---

## Commit Discipline

**NEVER run `git commit` yourself.** After every logical batch of changes tell the user:

`**COMMIT CHECKPOINT** — suggested message: \`<conventional commit message>\``

- Never add `Co-Authored-By` lines.
- Never skip pre-commit hooks.
- Validate scope against `commitlint.config.cjs`. Allowed scopes: `admin`, `types`, `repo`, `ci`, `docs`.

---

## What NOT to Do

- Do not run `pnpm run test` without `--testPathPattern`.
- Do not commit `.env` files or secrets.
- Do not add `// eslint-disable` comments.
- Do not create new files when editing existing ones achieves the goal.
- Do not fabricate command output, test results, or lint results.

---

## Commit Format

```
feat(admin): add user management table
fix(admin): resolve pagination in org list
chore(repo): update husky hooks
test(admin): add coverage for StatsCard
```
