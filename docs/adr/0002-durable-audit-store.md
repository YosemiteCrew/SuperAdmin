# 0002. Audit log is a durable compliance record in Postgres

**Status:** Accepted
**Date:** 2026-09-05
**Supersedes:** ADR-0001

## Context

The panel now has its own Postgres database and stores compliance records there. The audit log
still lived in one mutable SuperTokens UserMetadata value, dropped entries after 250 writes, and
could lose concurrent writes from separate application instances. It also stored email addresses
while ADR-0001 explicitly described the log as non-authoritative.

## Decision

Store every privileged action as an immutable `AuditEvent` row in the panel's Postgres database.
Writes take a transaction-scoped Postgres advisory lock before linking and inserting the next hash,
so separate application instances cannot fork the chain. A database trigger refuses updates and
deletes. The UI may load only its 250 most-recent rows, but that is a display limit, not retention.

The log is a compliance record. Account erasure does not rewrite historical audit rows because the
identity and action are retained to demonstrate how privileged access and data-subject requests
were handled. A fixed expiry period is not guessed in application code; legal policy must define it
before a controlled archival or deletion mechanism is added.

## Consequences

- Audit history is no longer capped or stored with authentication metadata.
- Writes remain fail-open for the underlying admin action, but failures are logged at error level.
- Existing UserMetadata audit entries remain readable only in the legacy store until a one-time,
  owner-reviewed migration is run; this change never copies production data during deployment.
- The database role cannot update or delete audit rows through normal application access.
