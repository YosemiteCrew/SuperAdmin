# Live smoke-test checklist — Super Admin panel

These checks **cannot** be covered by unit tests / CI, because they exercise the real
SuperTokens core, the browser, the auth flow, or the platform backend. Run them against a
running app (`pnpm --filter admin run dev`) signed in as a super admin (creds + TOTP)
before marking PR #81 ready for review / merge.

Legend: 🔴 = highest risk (touches the live auth flow — validate first) · 🟡 = important ·
⚪ = nice-to-have · ⛔ = blocked until the platform backend endpoint exists.

---

## Auth & MFA 🔴

- [ ] 🔴 **Mandatory MFA**: sign in with email+password → you are forced to `/auth/mfa/totp`
      (enroll on first login, challenge thereafter). You cannot reach `/dashboard` until MFA
      is complete.
- [ ] 🔴 **MFA-incomplete session**: a signed-in-but-MFA-incomplete session can reach
      `/auth/mfa*` but is redirected away from every dashboard route.
- [ ] 🟡 **Bootstrap allowlist**: an email in `superadminBootstrapEmails` is auto-granted the
      `superadmin` role on first authorized visit.
- [ ] 🟡 **Non-admin**: a standard user who signs in lands on `/forbidden`, and its "Sign out"
      button returns them to `/auth`.
- [ ] ⚪ **lastSignInAt**: after a fresh sign-in, the user's "Last seen" updates on the users
      list and detail page.

## Account disable / enable 🔴 (new live auth path — validate carefully)

- [ ] 🔴 **Disable blocks sign-in**: disable an account → it is signed out everywhere
      immediately (sessions revoked) **and cannot sign in again**. Re-enable → it can sign in.
- [ ] 🟡 **Badges & guards**: the "Disabled" badge shows on the users list, detail header, and
      Account status section; the disable control is hidden for yourself and bootstrap admins.
- [ ] ⚪ **Disabled message**: confirm the sign-in rejection UX (currently a generic
      "incorrect credentials" — intentional, to avoid account enumeration).

## Account recovery & RBAC 🟡

- [ ] 🟡 **Reset 2FA**: reset a locked-out admin's TOTP → they are signed out everywhere and
      must enroll a new TOTP device at next sign-in.
- [ ] 🟡 **Grant / revoke super-admin**: grant the role to a standard user → they gain panel
      access; revoke → they lose it (redirected to `/forbidden`).
- [ ] 🟡 **Guards**: you cannot revoke your own role (self-lockout), and you cannot remove the
      last remaining super-admin.

## Change own email 🔴 (Settings → Profile)

- [ ] 🔴 **Change email**: on Settings, change your own sign-in email → the update succeeds, the
      new address is **unverified**, and you can sign in with the new email afterward.
- [ ] 🟡 **Error paths**: changing to an email already in use shows "already in use"; an invalid
      address is rejected client- and server-side.

## Email verification 🟡

- [ ] 🔴 **Recipe doesn't gate sign-in**: adding the EmailVerification recipe (OPTIONAL mode)
      must NOT block existing users from signing in.
- [ ] 🟡 **Admin override**: "Mark verified" / "Mark unverified" on the user detail page flips
      the status shown (reads `loginMethods.verified`).

## Audit trail 🟡

- [ ] 🟡 **Every action is recorded**: perform delete, disable, enable, MFA reset, role
      grant/revoke, email verify/unverify, org verify/suspend/reactivate → each appears with
      correct actor / target / timestamp in: the **Activity** timeline (user detail), the
      **Recent admin activity** feed (dashboard), and the **/audit** page.
- [ ] 🟡 **/audit filters**: action dropdown, actor/target search, date-range (from/to),
      pagination (Previous / Next), and CSV export (downloads the full filtered set).
- [ ] 🟡 **Bulk actions**: multi-select + bulk Disable / Enable; bulk **Delete requires typing
      `DELETE`**; all are audited.
- [ ] ⚪ **Retention**: confirm the 250-entry cap behaves (oldest events roll off).

## Pages & real data 🟡

- [ ] 🟡 **Dashboard** stats (total users, new in 7 days, latest signup, recent signups)
      reflect the real core.
- [ ] 🟡 **Analytics** (totals, 7/30-day signups, 14-day trend, sign-in-method breakdown).
- [ ] 🟡 **Users list**: search by email + pagination (Next / First page) against the core.
- [ ] 🟡 **Settings**: profile editor saves first/last name; password reset; sign-out-
      everywhere; Appearance theme section.

## Design system / UX ⚪

- [ ] ⚪ **Theme**: Light / Dark / System toggle works across all pages **including the
      prebuilt MFA/TOTP screens**, with no flash of unstyled/partially-themed UI on load.
- [ ] ⚪ **Loading skeletons** appear while navigating to data-fetching pages.
- [ ] ⚪ **Command palette** (⌘K / Ctrl+K) opens, searches, and navigates.
- [ ] ⚪ **Self-hosted Satoshi** font renders (no Fontshare CDN request in the network tab).

## Organizations ⛔ (blocked until `NEXT_PUBLIC_API_URL` + the backend endpoint exist)

- [ ] ⛔ **List loads** real businesses from `GET /v1/super-admin/businesses`; status tabs +
      name search filter correctly.
- [ ] ⛔ **Verify / suspend / reactivate** persist via `PATCH /v1/super-admin/businesses/:id`
      and update visibility to pet parents.
- [ ] ⛔ **Detail page** renders identity / contact / compliance / activity.
- [ ] 🟡 **Corroboration**: on the org detail page, "Run pre-verification checks" performs the
      live website fetch and shows the confidence flag + checklist. (Can be exercised today via
      `?demo=1`.)
- [ ] ⚪ **`?demo=1`** still renders the sample businesses for design review.

## Security / misc ⚪

- [ ] ⚪ **Security headers** (CSP etc.) present on responses.
- [x] ✅ **CSP nonce (flipped to enforce — #3)**: `Content-Security-Policy` now uses
      `buildStrictCsp(nonce)` (strict-dynamic, no `unsafe-inline`); `buildEnforcedCsp`
      and the Report-Only header have been removed. Remaining verification: in a prod
      build, open DevTools on each page type (auth, dashboard, users, settings, org
      detail, prebuilt MFA/TOTP) and confirm **zero** CSP console errors. Each HTML
      response should carry a fresh `nonce-…` on Next's scripts and the inline theme
      script.
- [ ] ⚪ **No console errors** on each page in production mode (`pnpm --filter admin run build` + start).
