import {
  AUDIT_LOG_LIMIT,
  AUDIT_META,
  buildAuditEvent,
  describeAuditEvent,
  isValidAuditEvent,
  prependCapped,
} from '@/app/features/audit/audit';
import { AUDIT_TARGET_TYPES } from '@/app/features/audit/types';
import type { AuditEvent } from '@/app/features/audit/types';

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

describe('buildAuditEvent', () => {
  it('uses provided id and timestamp and omits an empty label', () => {
    const event = buildAuditEvent(
      {
        action: 'org.verify',
        actorId: 'a',
        actorEmail: 'a@x.com',
        targetType: 'organization',
        targetId: 'o1',
      },
      { id: 'fixed', at: 42 }
    );
    expect(event).toMatchObject({ id: 'fixed', at: 42, action: 'org.verify', targetId: 'o1' });
    expect('targetLabel' in event).toBe(false);
  });

  it('keeps a provided target label', () => {
    const event = buildAuditEvent(
      {
        action: 'org.verify',
        actorId: 'a',
        actorEmail: 'a@x.com',
        targetType: 'organization',
        targetId: 'o1',
        targetLabel: 'Acme',
      },
      { id: 'x', at: 1 }
    );
    expect(event.targetLabel).toBe('Acme');
  });

  it('generates an id and timestamp when none are supplied', () => {
    const before = Date.now();
    const event = buildAuditEvent({
      action: 'user.delete',
      actorId: 'a',
      actorEmail: 'a@x.com',
      targetType: 'user',
      targetId: 'u',
    });
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
    expect(event.at).toBeGreaterThanOrEqual(before);
  });

  it('falls back to a getRandomValues id when randomUUID is unavailable', () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i += 1) arr[i] = i + 1;
          return arr;
        },
      },
      configurable: true,
    });
    try {
      const event = buildAuditEvent({
        action: 'user.delete',
        actorId: 'a',
        actorEmail: 'a@x.com',
        targetType: 'user',
        targetId: 'u',
      });
      expect(event.id).toMatch(/^[a-z0-9]+-[0-9a-f]{16}$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });
});

describe('prependCapped', () => {
  it('prepends the newest event', () => {
    const result = prependCapped([sample({ id: 'old' })], sample({ id: 'new' }));
    expect(result.map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('caps the log to the limit', () => {
    const log = Array.from({ length: AUDIT_LOG_LIMIT }, (_, i) => sample({ id: `e${i}` }));
    const result = prependCapped(log, sample({ id: 'newest' }));
    expect(result).toHaveLength(AUDIT_LOG_LIMIT);
    expect(result[0].id).toBe('newest');
  });

  it('honors a custom limit', () => {
    const result = prependCapped(
      [sample({ id: 'a' }), sample({ id: 'b' })],
      sample({ id: 'c' }),
      2
    );
    expect(result.map((e) => e.id)).toEqual(['c', 'a']);
  });
});

describe('isValidAuditEvent', () => {
  it('accepts a well-formed event', () => {
    expect(isValidAuditEvent(sample())).toBe(true);
  });

  // Guards the union/validator drift that silently drops events on readback: a
  // feature adding a target kind to AUDIT_TARGET_TYPES gets it registered here by
  // construction, and this fails if the validator is ever hand-listed again.
  // Supersedes this branch's hand-listed version of the same check, which had to
  // be remembered; 'system' is now picked up from the list automatically.
  it.each(AUDIT_TARGET_TYPES.map((targetType) => [targetType]))(
    'accepts every declared target type (%s)',
    (targetType) => {
      expect(isValidAuditEvent(sample({ targetType }))).toBe(true);
    }
  );

  it('accepts a crm.contact_sync system event round-tripped through the cap', () => {
    const event = sample({
      action: 'crm.contact_sync',
      targetType: 'system',
      targetId: 'plunk',
      targetLabel: 'Plunk (2 synced, 0 failed)',
    });
    const [stored] = prependCapped([], event);
    expect(isValidAuditEvent(JSON.parse(JSON.stringify(stored)))).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['a bad action', sample({ action: 'bogus' as AuditEvent['action'] })],
    ['a bad target type', sample({ targetType: 'planet' as AuditEvent['targetType'] })],
    ['a non-numeric timestamp', { ...sample(), at: 'soon' }],
    ['a missing actorId', { ...sample(), actorId: undefined }],
  ])('rejects %s', (_label, value) => {
    expect(isValidAuditEvent(value)).toBe(false);
  });
});

describe('describeAuditEvent', () => {
  it('combines the action label with the target label', () => {
    expect(describeAuditEvent(sample())).toBe('Deleted user victim@x.com');
  });

  it('falls back to the target id when no label is present', () => {
    expect(describeAuditEvent(sample({ targetLabel: undefined }))).toBe('Deleted user u-1');
  });

  it('falls back to the raw action for an unknown action', () => {
    const event = sample({ action: 'mystery' as AuditEvent['action'], targetLabel: 'X' });
    expect(describeAuditEvent(event)).toBe('mystery X');
  });
});

describe('AUDIT_META', () => {
  it('has a label and severity for every action', () => {
    for (const meta of Object.values(AUDIT_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(['info', 'warning', 'danger']).toContain(meta.severity);
    }
  });
});
