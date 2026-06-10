<!--
We, the rest of the Yosemite community, thank you for your contribution!
To help the rest of the community review your change, please follow the instructions in the template.
-->

## PR Checklist

- [x] The PR title follows our guidelines.
- [ ] There is an issue for the bug/feature this PR is for.
- [x] All existing tests and lints pass (`pnpm verify` is green).

## What is the current behavior?

The `apps/admin` workspace was a `create-next-app` stub with SuperTokens' prebuilt UI mounted at `/auth`. There was no sign-in we controlled, no users surface, no design system, and no operator README. Middleware was permissive, security headers were loose (`connect-src *`, no HSTS), and a few SDK calls would crash the page on a single SuperTokens core blip.

## What is the new behavior?

I dropped the prebuilt UI and built out the full Super Admin surface end-to-end.

### Auth

I wrote custom Sign in, Sign up, and Reset-password screens with floating labels and a small guest header that flips its CTA between "Sign in" and "Sign up" depending on the path. First and last name go to SuperTokens user metadata at signup. `/api/signout` was setting cookies with the wrong `Path` per cookie, which caused a redirect loop with the middleware on a still-valid token. Fixed by clearing each session cookie with its actual `Path`, `HttpOnly`, prod-only `Secure`, and `SameSite=Lax`. I also override `EmailPassword.signInPOST` and `signUpPOST` to record `lastSignInAt` in user metadata after each successful auth — this powers the "Last seen" column.

### Dashboard chrome

Collapsible icon-only sidebar grouped by route (Overview, People & Access, Insights, Account) with per-route tooltips. A glass header with a gradient-avatar profile dropdown, a notification icon, and a ⌘K command palette chip. The palette itself is a centered modal with keyboard nav and a quick-action list — same pattern as the production app.

The display name in the header is sourced from SuperTokens metadata when present, otherwise from the first chunk of the email's local part. So `aman.gupta@gmail.com` shows as "aman" until they fill in a real first name.

### Users

`/users` lists everyone with email search, cursor pagination, a "Last seen" column (from `lastSignInAt`, falling back to `timeJoined`), and a row overflow menu with View and Delete. `/users/[id]` shows identity, active sessions, Revoke single / Revoke all (Server Actions), and a danger-zone Delete user gated by a typed confirmation. Delete works from both surfaces and shares one Server Action.

### Production-readiness

- `next build` finishes clean — 12 routes, healthy bundle sizes (largest is `/auth/[[...path]]` at 4 kB).
- Security headers in `apps/admin/src/securityHeaders.ts`: strict CSP (`connect-src 'self'`, `frame-ancestors 'self'`, `object-src 'none'`, `base-uri`, `form-action`, `upgrade-insecure-requests`), HSTS only in prod, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, locked-down `Permissions-Policy`. `unsafe-eval` stays in dev (Next.js HMR needs it) and gets stripped in prod.
- Env handling moved out of inline `process.env` reads into `env.public.ts` and `env.server.ts`. The server file uses `'server-only'` so a stray client import becomes a build error. Both fail fast on missing keys with a message that names the missing var.
- Replaced all stray logging with a small `logger` helper — JSON in prod, human-readable in dev. Added a `reportError` hook ready to wire Sentry into. Mounted `error.tsx` and `global-error.tsx` boundaries with a recovery UI.
- A11y: `SkipLink` is mounted in the root layout pointing at `#main-content`, `prefers-reduced-motion` is honored globally, ARIA labels are in place on every icon button.
- Added `GET /api/health` (no auth, no cache) for k8s / LB probes.
- Rewrote the admin README as an operator's guide — env table, scripts, architecture, security details, deploy steps, troubleshooting.

### Tooling

SonarCloud is wired to project key `YosemiteCrew_SuperAdmin` (org `yosemitecrew`). Local runs via `pnpm sonar` and `pnpm sonar:full` use `SONAR_TOKEN` from env, never inline. The workflow uses `dorny/paths-filter` to skip when `apps/admin/**` hasn't changed, plus an owner check so fork PRs can't reach the token.

A pre-commit secret scanner in `scripts/check-staged-secrets.js` blocks known token formats (Google API, AWS, Stripe, GitHub classic + fine-grained, Slack, SonarCloud, RSA / OpenSSH private keys) plus generic `secret = "..."` assignments filtered by Shannon entropy and placeholder hints. Runs `gitleaks` first when installed.

`scripts/clean-dev-cache.mjs` runs as `predev` and wipes `.next/cache` and `.turbo` before each `pnpm dev`. It probes port 3000 first and refuses to delete if a dev server is already running — Turbopack incremental cache poisoning had been biting us, this stops it for good.

`pnpm verify` chains lint → type-check → test:ci → build. The test script in `scripts/run-jest.mjs` blocks accidental full-suite runs in local dev; CI uses `test:ci`.

## Related Issue(s)

Fixes #

## Verification

```
pnpm verify
```

Output: lint clean, type-check clean for `@superadmin/types` and `admin`, 8 jest suites / 25 tests green, `next build` registers 12 routes. All four stages succeed.

Manual smoke after `pnpm --filter admin run dev`:

- `/` → 307 → `/auth`
- `/auth` → 200, custom sign-in renders
- `/auth/signup` → 200, header CTA shows "Sign in"
- `/auth/garbage` → 200 empty body, client redirects to `/auth`
- `/dashboard` unauthenticated → 307 → `/auth`
- `/api/auth/dashboard` → 404 (Dashboard recipe removed)
- `/api/health` → 200
- Sign out from header → `/api/signout` clears cookies → `/auth`

## Breaking changes

None. First real ship of `apps/admin`, no prior consumers.
