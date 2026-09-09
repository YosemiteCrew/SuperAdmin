# SuperAdmin — Engineering Handover (for Claude Code)

This document hands over the **YosemiteCrew/SuperAdmin** repository to a fresh agent
that will own the entire codebase. It captures the architecture, conventions, the
exact quality gate, the security posture, the gotchas learned the hard way, and the
open backlog. Read this once end‑to‑end before touching anything.

> There are already three agent rule files in the tree — **`CLAUDE.md`** (root),
> **`AGENTS.md`** (root), and **`apps/admin/AGENTS.md`**. They are auto‑loaded and
> are the source of truth for enforced rules. This handover complements them with
> context, state, and lessons; if anything here conflicts with those files, the
> rule files win.

---

## 1. What this repo is

A **Super Admin panel** for the Yosemite Crew platform: an internal, auth‑gated
console for managing users and partner businesses ("organizations"). It is a
**pnpm + Turbo monorepo** with a single app today.

- **Primary app:** `apps/admin` — Next.js 15 (App Router) web app.
- **Shared package:** `packages/types` — shared TypeScript types.
- **Backing identity system:** a **SuperTokens** core (managed dev core in dev),
  reached server‑side; the panel itself stores small bits of state in SuperTokens
  **UserMetadata**.

There is no separate product backend wired in yet. The Organizations feature is
built against a future REST endpoint (`/v1/super-admin/businesses`) and currently
runs in a `?demo=1` / on‑demand mode until that endpoint exists.

---

## 2. Current state (read this first)

- **Active branch:** `feat/admin-mfa-and-consoles` → targets **`dev`**.
- **Open PR:** **#81** (still a **Draft**), closes **Issue #80**.
- **CI:** GitHub Actions + **SonarCloud** (project key `YosemiteCrew_SuperAdmin`,
  org `yosemitecrew`). The PR SonarCloud quality gate has been kept **green**.
- **Size:** ~94 source files, ~72 test files under `apps/admin/src`.
- **Test/coverage status:** full suite green; local coverage ≈ **99.8% statements /
  96.9% functions** (see the gate in §6).

### What has already been done on this branch

1. Mandatory **MFA (TOTP)**, account recovery + **RBAC** management, account
   **disable/enable**, **email‑verification** admin overrides, a full **audit log**
   (timeline + dashboard feed + `/audit` page with filters + CSV export), **bulk
   user actions**, Settings consoles, Analytics, design‑system alignment.
2. A **white‑box security pentest** and remediation — see `apps/admin/SECURITY-PENTEST.md`.
3. **Codex** bot review fixes (disabled‑in‑authz, signout cookie clearing, bulk
   bootstrap guard, reset‑password routing, SSRF connection pinning).

### What is still open (backlog) — see §11 for detail

- CSP: strict nonce policy is shipped **Report‑Only**; still needs the live check
  then a flip to **enforce**.
- Audit log durability: `UserMetadata` read‑modify‑write can drop a concurrent
  event and isn't tamper‑evident — needs a durable **append‑only / WORM store**.
- App/edge **rate limiting**, **Dependabot #144** (moderate), and the live
  smoke‑test checklist (`apps/admin/SMOKE-TESTS.md`).
- Access hardening: putting the panel behind **Cloudflare Access / VPN / IP
  allowlist** (parked, to revisit).

---

## 3. Tech stack

| Area            | Choice                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js **15.5.x** (App Router, Turbopack in dev)                                                                                                  |
| Language        | TypeScript (strict), React 19                                                                                                                      |
| Package manager | **pnpm** (`packageManager: pnpm@8.15.6`) + **Turbo**                                                                                               |
| Auth            | **SuperTokens** (`supertokens-node` v24, `supertokens-auth-react`) — EmailPassword, Session, MFA, TOTP, UserRoles, UserMetadata, EmailVerification |
| Styling         | Tailwind v4 + semantic theme tokens (light/dark), self‑hosted Satoshi font                                                                         |
| Testing         | Jest + Testing Library, `jsdom` env, `next/jest` (swc transform)                                                                                   |
| Quality         | ESLint (+ `eslint-plugin-sonarjs`), Prettier, **SonarCloud**, secretlint, CodeQL                                                                   |
| Hooks           | Husky + lint‑staged + commitlint                                                                                                                   |

---

## 4. Repository layout

```
SuperAdmin/
├─ CLAUDE.md, AGENTS.md            # root agent rules (auto-loaded)
├─ commitlint.config.cjs           # enforced commit format (see §5)
├─ lint-staged.config.cjs          # pre-commit lint/secretlint
├─ docker-compose.dev.yml          # local Postgres + SuperTokens core for dev
├─ turbo.json, pnpm-workspace.yaml
├─ scripts/check-staged-secrets.js
├─ packages/types/                 # shared TS types
└─ apps/admin/                     # THE app
   ├─ AGENTS.md                    # app-specific agent rules
   ├─ SECURITY-PENTEST.md          # pentest findings + remediation status
   ├─ SMOKE-TESTS.md               # live, can't-unit-test checklist
   ├─ next.config.ts               # security headers wired here
   ├─ securityHeaders.ts           # CSP builders + static headers
   ├─ jest.config.ts               # coverage collection + exclusions
   ├─ sonar-project.properties     # Sonar config (coverage exclusions!)
   ├─ sonar-local.sh               # local lint→type→test→build→sonar pipeline
   ├─ scripts/sonar.mjs            # the actual scanner runner (PR mode aware)
   └─ src/
      ├─ middleware.ts             # redirect gating + CSP nonce per request
      └─ app/
         ├─ (routes)/(dashboard)/  # users, organizations, analytics, audit, settings, dashboard
         ├─ (routes)/forbidden/
         ├─ auth/[[...path]]/      # custom sign-in/reset UI + prebuilt MFA screens
         ├─ api/                   # auth catch-all, profile, signout, health
         ├─ config/                # backend.ts (SuperTokens init + guards), frontend.tsx, env.*
         ├─ features/              # audit, organizations, users, settings, analytics (logic + tests live here)
         ├─ components/, ui/, hooks/, lib/, constants/
         ├─ __tests__/             # mirrors src paths
         └─ jest.mocks/            # shared jest module mocks
```

**Key files to know:**

- `src/app/config/backend.ts` — SuperTokens server init, the **EmailPassword
  overrides** (sign‑up disabled, disabled‑account block at sign‑in), and the
  **`requireSuperAdmin()`** authorization gate used by every dashboard page and
  server action. This is the real security boundary.
- `src/middleware.ts` — non‑authoritative redirect gating + the **per‑request CSP
  nonce**. NOT a security boundary (it only decodes the JWT, doesn't verify it).
- `src/app/features/audit/store.ts` — the audit log (UserMetadata‑backed).
- `src/app/features/organizations/corroboration.ts` — the SSRF‑guarded website
  pre‑verification check (the most security‑sensitive feature code).

---

## 5. Conventions & guardrails (ENFORCED)

These are enforced by hooks/CI; violating them fails the commit or the build.

### Commits (commitlint, see `commitlint.config.cjs`)

- Format: `type(scope): subject`.
- **Allowed types:** `build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test`.
- **Allowed scopes:** **`admin, types, repo, ci, docs`** (only these).
- **Header ≤ 100 characters.** (We hit this — a 110‑char header was rejected.)
- The agent must **never run `git commit` itself** (CLAUDE.md rule). Propose a
  message; the human commits. Pre‑commit hooks must pass — never `--no-verify`.

### Code quality

- **No `// eslint-disable`** to silence warnings — fix the root cause.
- Don't add comments/docstrings/types to code you didn't change.
- Don't add error handling for impossible states or design for hypothetical futures.
- Prefer editing existing files over creating new ones.
- Keep `eslint-plugin-sonarjs` clean locally — it mirrors many SonarCloud rules
  (but **not all** — SonarCloud has extra rules; see §7).

---

## 6. The quality gate (run before declaring any task done)

From `apps/admin/` (or use the root turbo scripts):

```bash
# 1. Type-check  (can take 60–120s on a cold run; set a generous timeout)
npx tsc --noEmit              # or: pnpm --filter admin run type-check

# 2. Lint (zero warnings)
pnpm --filter admin run lint

# 3. Targeted tests — NEVER the full suite ad-hoc during iteration
#    The `test` script wraps jest and REQUIRES a pattern (see gotcha §10).
pnpm --filter admin run test:unit -- --testPathPattern="<file>"
#    or run jest directly for a pattern + coverage:
npx jest --testPathPattern="<pattern>" --coverage --collectCoverageFrom="src/.../file.ts"

# 4. Build (prod) — catches runtime/SSR issues unit tests miss
pnpm --filter admin run build
```

**Coverage mandate:** target ≥ 95% (statements/branches/functions/lines). Any file
you touch must end ≥ the coverage you found it at; new files ship ≥ 90%. Report
real numbers — never fabricate.

**Full pipeline in one go (mirrors CI + runs SonarCloud):**

```bash
cd apps/admin && ./sonar-local.sh          # lint → type → test:coverage → build → sonar scan
SONAR_PR_KEY=81 ./sonar-local.sh           # PR-decoration mode (updates PR #81's gate)
```

---

## 7. SonarCloud workflow (important — this is where surprises live)

- CI runs SonarCloud on push via `.github/workflows/sonar-cloud-analysis.yml`
  (`projectBaseDir: apps/admin`).
- Locally, `sonar-local.sh` → `scripts/sonar.mjs` runs the scanner. It needs a
  token in `apps/admin/.sonar-token` (gitignored) or `SONAR_TOKEN` env.
- **Coverage exclusions must be aligned** in two places or Sonar reports 0%:
  - `jest.config.ts` → `coveragePathIgnorePatterns` (page/layout/loading, type‑only
    files, `supertokensProvider`).
  - `sonar-project.properties` → `sonar.coverage.exclusions`. **Use simple globs
    (`**/page.tsx`, `**/layout.tsx`, `**/loading.tsx`)** — Sonar's wildcard matcher
    does NOT reliably match the `(routes)` route‑group parentheses. We hit a false
    "84.5% coverage" gate caused by this.
- **SonarCloud has rules beyond `eslint-plugin-sonarjs`.** Examples it flagged that
  local lint did not: redundant type assertions, "functions nested > 4 levels deep",
  and `String(input)` → `[object Object]`. After pushing, check the PR for new
  SonarCloud issues and clear them.
- The repo's intended loop: **find issues locally before they appear on the PR.**
  Run the local Sonar scan, fix everything, then push.

---

## 8. Auth & authorization model (critical to understand)

- **Sign‑in:** EmailPassword **+ mandatory TOTP MFA**. `requireSuperAdmin()`
  enforces: valid session → `superadmin` role → MFA complete; otherwise redirects
  to `/auth`, `/forbidden`, or `/auth/mfa/totp`.
- **Public self‑registration is DISABLED** (`signUpPOST: undefined` in
  `backend.ts`) and the sign‑up UI is removed. New admins must be **provisioned
  out‑of‑band** (script/SuperTokens dashboard/API). Do **not** re‑enable self
  sign‑up without also gating the bootstrap grant on a verified email.
- **Bootstrap admins:** any email in `SUPERADMIN_BOOTSTRAP_EMAILS` is auto‑granted
  the `superadmin` role on first authorized visit. Bootstrap (break‑glass) accounts
  are protected from disable/lockout (incl. in bulk actions).
- **Disabled accounts:** carry a `disabledAt` timestamp in UserMetadata; sign‑in is
  blocked (fails **closed**) and `requireSuperAdmin()` also rejects a disabled
  account whose session outlived them (fails **open** there to avoid panel‑wide
  lockout on a metadata blip).
- **Single‑admin risk:** with self‑signup off, keep at least two super‑admins (or a
  documented provisioning path) so a lost TOTP device can't lock everyone out.

---

## 9. Testing conventions

- Tests live under `src/app/__tests__/` mirroring the source path. Feature logic
  tests live alongside the feature too.
- Env: `jsdom`. `node:http`/`node:dns`/`node:net` work (used by the SSRF pin tests
  with a loopback server). **`Request` is NOT a global** in this env — use a
  `{ url }` object cast if you need a Request‑like input.
- SuperTokens and other heavy modules are **mocked** per test (see existing tests
  and `src/app/jest.mocks/`). Importing the real `supertokens-node` in a jsdom test
  triggers `TextEncoder`/`Request` errors — mock it.
- Route‑convention files (`page.tsx`, `layout.tsx`, `loading.tsx`), type‑only files,
  and `supertokensProvider.tsx` are **excluded from coverage** — don't chase
  coverage on them.
- The `test` script (`run-jest.mjs`) **blocks full‑suite runs** without a
  `--testPathPattern`. For a specific pattern, prefer `npx jest --testPathPattern=…`
  directly (see gotcha §10 about a `--` arg quirk).

---

## 10. Gotchas & lessons learned (save yourself the time)

1. **`next build` always runs as `NODE_ENV=production`.** Any code that throws in
   production env will break local/CI builds. The https‑origin guard in
   `env.public.ts` therefore allows `http://localhost` (loopback) explicitly.
2. **Stale `.next` after middleware/CSP changes** → `ENOENT … edge/chunks/*.js`.
   Fix: `rm -rf apps/admin/.next` (there's a `dev:clean` script).
3. **commit‑msg header ≤ 100 chars.** A long header aborts the commit but leaves
   files staged — a following commit can then sweep them up under the wrong message.
   Watch the staging state if a commit fails.
4. **`pnpm --filter admin run test -- --flag`** forwards a leading `--` that makes
   jest treat the flag as a positional regex. Run `npx jest --testPathPattern=…`
   directly, or `test:unit -- --testPathPattern=…`.
5. **secretlint** blocks any DB connection‑string literal (e.g.
   `postgresql://user:pass@host/db`). Use discrete env vars
   (`POSTGRESQL_HOST/USER/PASSWORD/...`) instead of a URI in compose files.
6. **lint‑staged + bracketed route filenames** (`[[...path]]`) — secretlint glob
   expansion needs the brackets escaped (handled in `lint-staged.config.cjs`).
7. **Deleting files** the agent created may need elevated perms in some
   environments; `git rm` after the file is removed on disk works.
8. Never commit `.env*`, `.sonar-token`, `sonar-issues.json`, `.next`, coverage —
   all gitignored. `pnpm audit` is clean; git history has no secrets (verified).

---

## 11. Backlog / next work (prioritized)

| Pri  | Item                                                                                                                     | Where                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| High | **Flip CSP to enforce** after the live Report‑Only check passes (zero violations across auth/dashboard/MFA screens)      | `securityHeaders.ts`, `middleware.ts`, `SMOKE-TESTS.md` |
| High | **Durable append‑only audit store** (DB/SIEM) to replace the UserMetadata log — fixes concurrency loss + tamper‑evidence | `features/audit/store.ts`, SECURITY‑PENTEST #5          |
| Med  | **App/edge rate limiting** on auth (infra/edge)                                                                          | infra + `api/auth/*`                                    |
| Med  | Resolve **Dependabot #144** (moderate, default branch) — confirm vs. the js‑yaml override already in the PR              | repo deps                                               |
| Med  | **Access hardening:** Cloudflare Access / VPN / IP allowlist in front of the panel; `noindex` headers (parked, revisit)  | infra + headers                                         |
| Low  | Organizations: wire real backend `GET/PATCH /v1/super-admin/businesses` once it exists; today it's `?demo=1`/on‑demand   | `features/organizations/*`                              |
| Low  | Run the **live smoke tests** against a real SuperTokens core (auth, disable, MFA reset, etc.)                            | `SMOKE-TESTS.md`                                        |
| Low  | Signout path matching in the auth catch‑all is fragile (functional + tested)                                             | `api/auth/[[...path]]/route.ts`                         |

The two security docs are the canonical trackers:

- `apps/admin/SECURITY-PENTEST.md` — findings + per‑item remediation status.
- `apps/admin/SMOKE-TESTS.md` — risk‑ranked live checks not coverable by unit tests.

---

## 12. Environment variables

Set in `apps/admin/.env.local` (gitignored). Required:

| Var                           | Purpose                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_ORIGIN`      | App origin; **must be https in production** (loopback http allowed for local builds). Drives SuperTokens cookie `Secure`. |
| `SUPERTOKENS_CONNECTION_URI`  | SuperTokens core URL (server‑side only).                                                                                  |
| `SUPERTOKENS_API_KEY`         | SuperTokens core API key (server‑side only).                                                                              |
| `SUPERADMIN_BOOTSTRAP_EMAILS` | Comma‑separated allowlist auto‑granted `superadmin` on first visit.                                                       |

Local Sonar only: `apps/admin/.sonar-token` (or `SONAR_TOKEN`). Local dev infra:
`docker-compose.dev.yml` (Postgres + SuperTokens core).

---

## 13. Issue / PR workflow

- Base SHA: `git merge-base HEAD upstream/dev`. Build PR/issue bodies from the
  **actual diff** (`<base>..HEAD`), grouped by domain — not from commit titles.
- Templates: `.github/ISSUE_TEMPLATE/feature_request.md`,
  `.github/PULL_REQUEST_TEMPLATE.md`.
- PR title follows the same conventional‑commit format and scopes.
- PR #81 is a **Draft** with two reviewers assigned; it needs **1 approving
  review** and a green Sonar gate before it can merge into `dev`, then `dev → main`.
- `Closes #80` in the PR body auto‑closes the issue on merge.

---

## 14. First moves for the new agent

1. `cd apps/admin && ./sonar-local.sh` to confirm a green baseline (lint, type,
   tests+coverage, build, sonar) on the current branch.
2. Read `SECURITY-PENTEST.md` and `SMOKE-TESTS.md` — they define the open security
   surface and the manual verification owed before merge.
3. Pick from §11 backlog. The two highest‑value items are the **CSP enforce flip**
   (after the live check) and the **durable audit store**.
4. For any change touching `apps/admin`: run the full gate (§6), keep coverage at or
   above where you found it, run the local Sonar scan, fix every issue/hotspot, then
   propose a conventional‑commit message (≤100 chars) for the human to commit.

Welcome aboard. The codebase is in good shape and well‑tested — keep it that way.
