import {
  canonicalAuditEvent,
  GENESIS_HASH,
  hashAuditEvent,
  verifyChain,
} from '@/app/features/audit/chain';
import type { AuditEvent, StoredAuditEvent } from '@/app/features/audit/types';

function sample(over: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'e1',
    action: 'user.delete',
    actorId: 'admin-1',
    actorEmail: 'admin@x.com',
    targetType: 'user',
    targetId: 'u-1',
    targetLabel: 'victim@x.com',
    at: 1_700_000_000_000,
    ...over,
  };
}

/** Links `events` (oldest-first) into a hash chain, returned newest-first. */
function chain(events: AuditEvent[]): StoredAuditEvent[] {
  const stored: StoredAuditEvent[] = [];
  let prevHash = GENESIS_HASH;
  for (const e of events) {
    const hash = hashAuditEvent(prevHash, e);
    stored.push({ ...e, prevHash, hash });
    prevHash = hash;
  }
  return stored.reverse();
}

describe('canonicalAuditEvent', () => {
  it('is deterministic for the same event', () => {
    expect(canonicalAuditEvent(sample())).toBe(canonicalAuditEvent(sample()));
  });

  it('changes when any field changes', () => {
    expect(canonicalAuditEvent(sample())).not.toBe(
      canonicalAuditEvent(sample({ actorEmail: 'other@x.com' }))
    );
  });

  it('distinguishes a missing label from an empty one', () => {
    expect(canonicalAuditEvent(sample({ targetLabel: undefined }))).not.toBe(
      canonicalAuditEvent(sample({ targetLabel: '' }))
    );
  });
});

describe('hashAuditEvent', () => {
  it('produces a 64-char hex digest', () => {
    expect(hashAuditEvent(GENESIS_HASH, sample())).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when the previous hash or the event changes', () => {
    const base = hashAuditEvent(GENESIS_HASH, sample());
    expect(hashAuditEvent('a'.repeat(64), sample())).not.toBe(base);
    expect(hashAuditEvent(GENESIS_HASH, sample({ targetId: 'u-2' }))).not.toBe(base);
  });
});

/** Removes the chain fields from a stored event (simulates a stripping attack). */
function strip(event: StoredAuditEvent): StoredAuditEvent {
  const copy = { ...event };
  delete copy.prevHash;
  delete copy.hash;
  return copy;
}

describe('verifyChain', () => {
  it('accepts an intact chain and an empty log', () => {
    const events = chain([sample({ id: 'a' }), sample({ id: 'b' }), sample({ id: 'c' })]);
    expect(verifyChain(events)).toEqual({ ok: true, length: 3, total: 3 });
    expect(verifyChain([])).toEqual({ ok: true, length: 0, total: 0 });
  });

  it('detects an interior event whose contents were edited', () => {
    const events = chain([sample({ id: 'a' }), sample({ id: 'b' }), sample({ id: 'c' })]);
    events[1] = { ...events[1], actorEmail: 'attacker@x.com' };
    expect(verifyChain(events)).toEqual({
      ok: false,
      length: 1,
      total: 3,
      brokenAtId: 'b',
      reason: 'content-altered',
    });
  });

  it('detects an interior event that was deleted', () => {
    const [newest, , oldest] = chain([
      sample({ id: 'a' }),
      sample({ id: 'b' }),
      sample({ id: 'c' }),
    ]);
    expect(verifyChain([newest, oldest])).toEqual({
      ok: false,
      length: 0,
      total: 2,
      brokenAtId: 'c',
      reason: 'link-broken',
    });
  });

  it('detects an interior event whose hash was stripped to truncate verification', () => {
    // Editing an interior event and removing its chain fields must NOT pass as a
    // legacy tail: the event above it links to a non-genesis predecessor.
    const events = chain([
      sample({ id: 'a' }),
      sample({ id: 'b' }),
      sample({ id: 'c' }),
      sample({ id: 'd' }),
    ]);
    events[1] = strip({ ...events[1], actorEmail: 'attacker@x.com' });
    const status = verifyChain(events);
    expect(status.ok).toBe(false);
    expect(status.reason).toBe('link-broken');
  });

  it('detects the newest entry having its hash stripped above a chained region', () => {
    // Stripping the head must not be readable as "this log predates the chain":
    // the entries below it are demonstrably chained, so the hash was removed to
    // end the walk before it started.
    const events = chain([sample({ id: 'a' }), sample({ id: 'b' }), sample({ id: 'c' })]);
    events[0] = strip(events[0]);
    expect(verifyChain(events)).toEqual({
      ok: false,
      length: 0,
      total: 3,
      brokenAtId: 'c',
      reason: 'head-unchained',
    });
  });

  it('tolerates a fully pre-chain log where no entry was ever hashed', () => {
    // The genuine legacy case the head guard must not regress: nothing below the
    // newest entry is chained either, so there is no evidence of a strip.
    const events: StoredAuditEvent[] = [sample({ id: 'a' }), sample({ id: 'b' })];
    expect(verifyChain(events)).toEqual({ ok: true, length: 0, total: 2 });
  });

  it('does not report any verified events when every hash is stripped', () => {
    const events = chain([sample({ id: 'a' }), sample({ id: 'b' })]).map(strip);
    // No tampering is provable on an all-hashless log, but length < total tells a
    // caller that nothing was actually verified.
    expect(verifyChain(events)).toEqual({ ok: true, length: 0, total: 2 });
  });

  it('tolerates legacy (pre-chain) entries below the chained region', () => {
    const events = [...chain([sample({ id: 'a' }), sample({ id: 'b' })]), sample({ id: 'legacy' })];
    expect(verifyChain(events)).toEqual({ ok: true, length: 2, total: 3 });
  });

  it('tolerates the oldest chained entry being evicted by the cap', () => {
    const events = chain([sample({ id: 'a' }), sample({ id: 'b' }), sample({ id: 'c' })]);
    expect(verifyChain(events.slice(0, 2))).toEqual({ ok: true, length: 2, total: 2 });
  });

  it('treats a chained entry with no prevHash as genesis', () => {
    const event = sample({ id: 'g' });
    const stored: StoredAuditEvent = { ...event, hash: hashAuditEvent(GENESIS_HASH, event) };
    expect(verifyChain([stored])).toEqual({ ok: true, length: 1, total: 1 });
  });
});
