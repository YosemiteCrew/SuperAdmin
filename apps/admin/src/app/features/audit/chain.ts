import { createHash } from 'node:crypto';

import type { AuditChainStatus, AuditEvent, StoredAuditEvent } from './types';

// Server-only: this module uses node:crypto, so it must never be reachable from
// a client bundle. Only the server-side audit store (store.ts) imports it —
// keep it out of any module a client component pulls in (e.g. csv.ts).

/** prevHash used for the first event in a chain (no predecessor). */
export const GENESIS_HASH = '0'.repeat(64);

/**
 * Deterministic serialisation of the fields that define an event, in a fixed
 * order, so the same event always hashes to the same value. An array (not an
 * object) avoids any key-ordering ambiguity; a missing label is normalised to
 * null so it cannot collide with an empty-string label.
 */
export function canonicalAuditEvent(event: AuditEvent): string {
  return JSON.stringify([
    event.id,
    event.at,
    event.action,
    event.actorId,
    event.actorEmail,
    event.targetType,
    event.targetId,
    event.targetLabel ?? null,
  ]);
}

/** SHA-256 hex digest linking an event to the hash of the previous one. */
export function hashAuditEvent(prevHash: string, event: AuditEvent): string {
  return createHash('sha256')
    .update(`${prevHash}\n${canonicalAuditEvent(event)}`)
    .digest('hex');
}

/**
 * Verifies the hash chain over a newest-first log. Walks from the newest event,
 * checking each event's own hash and its link to the next-older event. Two
 * boundaries are legitimately tolerated: the oldest chained entry whose
 * predecessor was evicted by the cap (no older event), and a pre-chain legacy
 * tail (older entries with no `hash`) — but ONLY below an event that genuinely
 * links back to GENESIS. An interior edit (recomputed hash mismatch), a deletion
 * (broken link), or a stripped `hash` used to truncate verification mid-chain all
 * surface as `ok: false`. Because the chain is unkeyed, a metadata writer can
 * still recompute a fully consistent chain after editing; this is tamper-evident,
 * not tamper-proof.
 */
export function verifyChain(events: StoredAuditEvent[]): AuditChainStatus {
  const total = events.length;
  let length = 0;
  for (let i = 0; i < events.length; i += 1) {
    const current = events[i];
    // A hashless event is only legitimate as the genuine pre-chain tail, reached
    // below a GENESIS-linked event (handled at the boundary check below). Hitting
    // one here otherwise means i === 0 on a fully pre-chain (legacy) log.
    if (typeof current.hash !== 'string') break;
    const prevHash = current.prevHash ?? GENESIS_HASH;
    if (hashAuditEvent(prevHash, current) !== current.hash) {
      return { ok: false, length, total, brokenAtId: current.id, reason: 'content-altered' };
    }
    const older = events[i + 1];
    if (older && typeof older.hash !== 'string') {
      // Transition into a hashless region. Legitimate only when `current` is the
      // genesis-linked oldest chained event; otherwise the successor's hash was
      // stripped to truncate verification — treat that as tampering.
      if (prevHash !== GENESIS_HASH) {
        return { ok: false, length, total, brokenAtId: current.id, reason: 'link-broken' };
      }
      length += 1;
      break;
    }
    if (older && prevHash !== older.hash) {
      return { ok: false, length, total, brokenAtId: current.id, reason: 'link-broken' };
    }
    length += 1;
  }
  return { ok: true, length, total };
}
