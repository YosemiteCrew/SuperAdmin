# 0001. Audit log persisted in SuperTokens UserMetadata (no dedicated DB, no CAS)

**Status:** Accepted
**Date:** 2026-07-01

## Context

SuperAdmin (`apps/admin`) uses SuperTokens exclusively for auth — EmailPassword, EmailVerification, Session, UserMetadata, UserRoles, TOTP/MFA recipes (`apps/admin/src/app/config/backend.ts`). There is no Prisma schema, no Mongoose, no dedicated database anywhere in this app. Adding one solely to store an audit trail for a low-traffic internal admin panel would mean standing up, migrating, and operating a second datastore for a single feature.

An audit trail was still needed: who disabled a user, who changed a role, when.

## Decision

Store the audit log as a single append-only record inside a reserved, non-user key in SuperTokens UserMetadata (`apps/admin/src/app/features/audit/store.ts`). `recordAuditEvent()` reads the current log via `getUserMetadata()`, prepends the new event, caps it at 250 entries (`prependCapped()`), and writes it back via `updateUserMetadata()`. Audit recording is deliberately **best-effort and non-blocking**: failures are caught and swallowed so a failed audit write never blocks the underlying admin action (delete, role change, etc.) it's recording.

## Consequences

**Good:**
- No second datastore to provision, migrate, back up, or reason about for a single low-traffic feature.
- Zero new infrastructure — reuses the auth system SuperAdmin already depends on.

**Bad / accepted trade-offs:**
- UserMetadata has no compare-and-swap / optimistic-locking primitive. `recordAuditEvent()`'s read-modify-write cycle has a race window: two concurrent admin actions can both read the same log state and the second write overwrites the first, silently dropping one event.
- Audit is advisory, not authoritative — because failures are swallowed and the write isn't atomic with the action it records, this log cannot be relied on as a complete or tamper-evident record for compliance purposes. It's a debugging/visibility aid, not a compliance audit trail.
- Capped at 250 events with no archival — older entries are dropped, not stored elsewhere.

If SuperAdmin's audit requirements grow (compliance-grade completeness, alerting, longer retention), this decision should be revisited — see the note about durable audit-store constraints already tracked for that scenario.

## Alternatives considered

- **Add a dedicated database (Postgres/Prisma) just for audit logs**: rejected — disproportionate operational cost for a single internal feature with the current traffic/compliance requirements. Revisit if SuperAdmin's scope grows to need durable, race-free audit persistence.
- **Write audit events to an external logging service (e.g. Datadog/CloudWatch)**: not pursued yet — would solve the CAS/durability problem but adds an external dependency and cost; left as a future option rather than the current baseline.
