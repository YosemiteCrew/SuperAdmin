# Super Admin

Internal admin dashboard for the Yosemite Crew platform. Manages user accounts, sessions, organizations, and analytics via the SuperTokens core.

## Stack

- Next.js 15 (App Router, Turbopack dev)
- React 19 + TypeScript (strict)
- Tailwind CSS v4 with custom design tokens
- SuperTokens for auth (email/password, sessions, user metadata, multitenancy)
- Jest + Testing Library + jest-axe for tests

State is local React (`useState`, Server Components, URL params). No client state library.

## Quick start

```bash
pnpm install
cp apps/admin/.env.example apps/admin/.env.local
# fill in real values in .env.local (see "Configuration" below)

pnpm --filter admin run dev
```

App boots at `http://localhost:3000` (or the next free port if 3000 is busy — the SuperTokens origin auto-resolves at runtime).

## Configuration

All configuration is environment-driven. Missing required vars cause the app to throw at startup with a clear message naming the missing var.

| Variable                     | Required | Purpose                                                                                                  |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_ORIGIN`     | yes      | Origin where the app is served. `http://localhost:3000` in dev, `https://admin.your-domain.com` in prod. |
| `SUPERTOKENS_CONNECTION_URI` | yes      | SuperTokens core URI (e.g. `https://…aws.supertokens.io`).                                               |
| `SUPERTOKENS_API_KEY`        | yes      | SuperTokens core API key.                                                                                |

System-level constants (`APP_NAME`, SuperTokens base paths) live in [`src/app/constants/index.ts`](src/app/constants/index.ts) — these don't vary by environment and are not env-driven.

See [`.env.example`](.env.example) for a copy-paste template.

## Scripts

```bash
pnpm --filter admin run dev            # dev server (Turbopack)
pnpm --filter admin run build          # production build
pnpm --filter admin run start          # serve the production build
pnpm --filter admin run lint           # eslint
pnpm --filter admin run type-check     # tsc --noEmit
pnpm --filter admin run test           # targeted tests (--testPathPattern required)
pnpm --filter admin run test:ci        # full suite
pnpm --filter admin run test:coverage  # coverage report
```

> Targeted tests are enforced via [`scripts/run-jest.mjs`](scripts/run-jest.mjs) to prevent accidental full-suite runs in local dev. CI uses `test:ci`.

## Verify

```bash
pnpm verify
```

Runs `lint → type-check → test:ci → build` in order and fails fast. All four stages must pass before merging.

Individual stages:

```bash
pnpm lint
pnpm type-check
pnpm test:ci
pnpm build
```

### Inspect security headers + cookie attrs (requires a running prod build)

```bash
# Terminal 1 — build + serve
pnpm --filter admin run build
PORT=3099 NODE_ENV=production pnpm --filter admin run start

# Terminal 2 — probe
curl -sI http://localhost:3099/auth | grep -iE 'csp|hsts|frame|content-type|referrer|permissions|cross-origin|dns-prefetch'
curl -sI http://localhost:3099/api/signout | grep -i 'set-cookie:'
curl -s http://localhost:3099/api/health | jq .
```

You should see:

- **CSP** with `connect-src 'self'`, `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`
- **`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`** (prod only)
- **`Cross-Origin-Opener-Policy: same-origin-allow-popups`**, **`Cross-Origin-Resource-Policy: same-origin`**
- **Signout cookies** all with `HttpOnly; SameSite=Lax; Secure` and correct per-cookie `Path=` values
- **Health endpoint** returns `{ "status": "ok", "uptime": ..., "timestamp": "...", "env": "production" }`

### Inspect bundle sizes

```bash
pnpm --filter admin run build | grep -E '^├|^└|^Route|^First Load'
```

Quick read on what shipped and how heavy each route is.

### Smoke test the running app

```bash
# Stops any leftover prod server on 3099
lsof -ti :3099 | xargs -r kill -9

# Boots fresh dev server
pnpm --filter admin run dev
```

Then in a browser:

- `/auth` — sign-in form, header logo + Sign up CTA, "Don't have an account? Sign up" link
- `/auth/signup` — full signup form, header CTA reads "Sign in" (contextual swap)
- `/dashboard` (signed in) — Sidebar with 5 nav items + collapse, glass header with profile pill + ⌘K chip
- Press `⌘K` anywhere — command palette opens (matches production glass styling)
- Tab from page load — first focusable is "Skip to main content" (a11y)

## Architecture

```
src/
├─ app/
│  ├─ (routes)/(dashboard)/        # gated routes (sidebar + header)
│  │  ├─ layout.tsx                # admin session gate; lives behind /api/signout on failure
│  │  ├─ dashboard/                # stats overview, recent signups
│  │  ├─ users/                    # list + detail (search, pagination, session revoke)
│  │  ├─ organizations/            # tenants list (stub)
│  │  ├─ analytics/                # stub
│  │  └─ settings/                 # stub
│  ├─ auth/                        # custom sign-in / sign-up / reset password
│  ├─ api/
│  │  ├─ auth/[[...path]]/         # SuperTokens-managed
│  │  ├─ profile/                  # save first/last name to user metadata
│  │  ├─ signout/                  # cookie-clearing signout (gate-failure fallback)
│  │  └─ health/                   # GET /api/health → 200
│  ├─ config/
│  │  ├─ appInfo.ts, frontend.tsx, backend.ts
│  │  ├─ env.public.ts             # required NEXT_PUBLIC_* (throws if missing)
│  │  └─ env.server.ts             # required server-only (`'server-only'` import)
│  ├─ constants/                   # APP_NAME, SuperTokens base paths
│  ├─ lib/
│  │  ├─ logger.ts                 # structured JSON in prod, human-readable in dev
│  │  └─ reportError.ts            # Sentry-shaped error hook
│  ├─ ui/                          # design-system primitives
│  ├─ error.tsx, global-error.tsx  # error boundaries
│  └─ layout.tsx                   # root layout (favicon, title template, SkipLink)
├─ proxy.ts                        # auth-aware routing + matcher excludes public assets (Next 16 proxy)
└─ securityHeaders.ts              # CSP / HSTS / COOP / Permissions-Policy (prod-aware)
```

## Security

- **Strict CSP** with `connect-src 'self'`, `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. `'unsafe-eval'` only in dev (for HMR).
- **HSTS** with `max-age=63072000; includeSubDomains; preload` (prod only).
- **Cross-Origin-Opener-Policy** `same-origin-allow-popups`; **Cross-Origin-Resource-Policy** `same-origin`.
- **`upgrade-insecure-requests`** in prod.
- **Session cookies** are `HttpOnly + SameSite=Lax + Secure (prod)` — set by SuperTokens with correct paths; cleared by `/api/signout` with matching attributes.
- **Server-only secrets** enforced by `import 'server-only'` in `env.server.ts` — accidental client usage fails at build time.
- **Admin gate** runs server-side on `(dashboard)/layout.tsx`; non-authenticated traffic redirects to `/auth`; broken sessions go through `/api/signout` to clear cookies first (avoids redirect loops).

## Deployment

### Build

```bash
pnpm --filter admin run build
```

Produces `.next/` with a Standalone-eligible build. Page-level breakdown is printed at the end of the build (largest page: `/auth/[[...path]]` at ~4 kB + ~150 kB First Load JS due to the SuperTokens client SDK).

### Run in production

```bash
NODE_ENV=production pnpm --filter admin run start
```

### Required env at runtime

- All variables listed under [Configuration](#configuration)
- `NODE_ENV=production` enables HSTS, `Secure` cookies, drops `'unsafe-eval'` from CSP

### Health checks

```
GET /api/health
→ 200 { "status": "ok", "uptime": <seconds>, "timestamp": "...", "env": "production" }
```

No auth required. Suitable for k8s liveness/readiness and load-balancer probes.

### Common operational concerns

| Issue                                                   | Fix                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| App throws "Missing required public env var: X" on boot | Set `X` in `.env.local` (or platform env), restart                                                                    |
| Favicon doesn't update after deploy                     | Bump the `?v=N` suffix in `layout.tsx` `LOGO_PATH` to bust browser cache                                              |
| Port 3000 already in use                                | Next picks the next free port automatically; the app's origin detection adapts via `NEXT_PUBLIC_APP_ORIGIN`           |
| SuperTokens session invalid loop                        | Redirect goes through `/api/signout` which clears cookies with correct attrs — should self-recover on next navigation |

## Testing

```bash
# Targeted (default in local dev)
pnpm --filter admin run test --testPathPattern="<pattern>"

# Full suite
pnpm --filter admin run test:ci

# Coverage
pnpm --filter admin run test:coverage
```

## SonarCloud

Static analysis, code smells, security hotspots, coverage tracking.

- Project key: `YosemiteCrew_SuperAdmin`
- Organization: `yosemitecrew`
- Dashboard: <https://sonarcloud.io/project/overview?id=YosemiteCrew_SuperAdmin>

Configuration lives in [`apps/admin/sonar-project.properties`](sonar-project.properties).

### CI scanning (automatic)

Every push to `main` / `dev` and every PR triggers [.github/workflows/sonar-cloud-analysis.yml](../../.github/workflows/sonar-cloud-analysis.yml). The workflow runs `pnpm test:coverage` and feeds the lcov report to the Sonar scanner action.

Required GitHub secret: **`SONAR_TOKEN_ADMIN`** — set it once at `Settings → Secrets and variables → Actions`.

### Local scanning

```bash
# 1. Export your SonarCloud token (DO NOT commit this)
export SONAR_TOKEN=<your-personal-token>

# 2. Run a scan that also generates fresh coverage
pnpm --filter admin run sonar:full

# Or just the scan against existing coverage/lcov.info
pnpm --filter admin run sonar
```

The runner ([`scripts/sonar.mjs`](scripts/sonar.mjs)) fails fast with a clear message if `SONAR_TOKEN` is not exported.

### Generating a token

Visit <https://sonarcloud.io/account/security>, generate a project analysis token scoped to `YosemiteCrew_SuperAdmin`, and add it as `SONAR_TOKEN` in your local shell (or `~/.zshrc` / `~/.bashrc` for persistence — but never check the dotfile change into a public repo).

## Contributing

See the root [README](../../README.md) for repo-wide setup and contribution guidelines.
