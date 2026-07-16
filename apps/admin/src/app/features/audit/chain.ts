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
 * Resolves a newest event that carries no `hash`. Legitimate only when nothing
 * below it is chained either — a genuine pre-chain log, where there is simply
 * nothing to verify. If any older event still carries a hash, this one's was
 * stripped to end the walk before it began: the head equivalent of a mid-chain
 * strip, and the log is not what it claims to be.
 */
function unchainedHeadStatus(
  events: StoredAuditEvent[],
  head: StoredAuditEvent,
  total: number
): AuditChainStatus {
  if (events.some((event) => typeof event.hash === 'string')) {
    return { ok: false, length: 0, total, brokenAtId: head.id, reason: 'head-unchained' };
  }
  return { ok: true, length: 0, total };
}

/**
 * Resolves the boundary where the chain gives way to hashless (pre-chain) events.
 * Legitimate only when `current` is the genesis-linked oldest chained event;
 * otherwise the older event's hash was stripped to truncate verification.
 */
function hashlessBoundaryStatus(
  current: StoredAuditEvent,
  prevHash: string,
  length: number,
  total: number
): AuditChainStatus {
  if (prevHash !== GENESIS_HASH) {
    return { ok: false, length, total, brokenAtId: current.id, reason: 'link-broken' };
  }
  return { ok: true, length: length + 1, total };
}

/**
 * Verifies the hash chain over a newest-first log. Walks from the newest event,
 * checking each event's own hash and its link to the next-older event. Two
 * boundaries are legitimately tolerated: the oldest chained entry whose
 * predecessor was evicted by the cap (no older event), and a pre-chain legacy
 * tail (older entries with no `hash`) — but ONLY below an event that genuinely
 * links back to GENESIS. An interior edit (recomputed hash mismatch), a deletion
 * (broken link), or a stripped `hash` used to truncate verification at the head
 * or mid-chain all surface as `ok: false`. Because the chain is unkeyed, a
 * metadata writer can still recompute a fully consistent chain after editing;
 * this is tamper-evident, not tamper-proof.
 */
export function verifyChain(events: StoredAuditEvent[]): AuditChainStatus {
  const total = events.length;
  let length = 0;
  for (let i = 0; i < events.length; i += 1) {
    const current = events[i];
    // Reached only at the head (i === 0): a hashless event below a chained one is
    // caught by the boundary check further down, which stops the walk there.
    if (typeof current.hash !== 'string') return unchainedHeadStatus(events, current, total);
    const prevHash = current.prevHash ?? GENESIS_HASH;
    if (hashAuditEvent(prevHash, current) !== current.hash) {
      return { ok: false, length, total, brokenAtId: current.id, reason: 'content-altered' };
    }
    const older = events[i + 1];
    if (older && typeof older.hash !== 'string') {
      return hashlessBoundaryStatus(current, prevHash, length, total);
    }
    if (older && prevHash !== older.hash) {
      return { ok: false, length, total, brokenAtId: current.id, reason: 'link-broken' };
    }
    length += 1;
  }
  return { ok: true, length, total };
}
