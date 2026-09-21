import {
  AUDIT_LOG_LIMIT,
  AUDIT_META,
  AUDIT_SEVERITY_LABELS,
  auditTargetLabel,
  buildAuditEvent,
  describeAuditEvent,
  isValidAuditEvent,
  prependCapped,
} from '@/app/features/audit/audit';
import { AUDIT_TARGET_TYPE_LABELS, AUDIT_TARGET_TYPES } from '@/app/features/audit/types';
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
  // be remembered; 'data_request' is now picked up from the list automatically.
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

describe('auditTargetLabel — status enums resolved at display time', () => {
  /**
   * Both of these actions record a status enum as their targetLabel, so the
   * words must be applied when the row is rendered. Resolving at write time
   * would leave every event already in the log reading `in_progress`, and the
   * log has no migration path — it is hash-chained.
   */
  it('puts a contact request status into words', () => {
    const event = sample({
      action: 'contact.status_change',
      targetType: 'contact_request',
      targetLabel: 'in_progress',
    });
    expect(auditTargetLabel(event)).toBe('In progress');
    expect(describeAuditEvent(event)).toBe('Changed contact request status to In progress');
  });

  it('puts a data-subject request status into words', () => {
    const event = sample({
      action: 'privacy.request_update',
      targetType: 'data_request',
      targetLabel: 'in_progress',
    });
    expect(auditTargetLabel(event)).toBe('In progress');
    expect(describeAuditEvent(event)).toBe('Updated a data-subject request to In progress');
  });

  it('resolves each status against its own enum, not the other one', () => {
    // `closed` is a contact status and `fulfilled` a data-request status, and
    // neither exists in the other enum. A single shared map would render one of
    // these as its raw value while still passing the two cases above.
    expect(
      auditTargetLabel(sample({ action: 'contact.status_change', targetLabel: 'closed' }))
    ).toBe('Closed');
    expect(
      auditTargetLabel(sample({ action: 'privacy.request_update', targetLabel: 'fulfilled' }))
    ).toBe('Fulfilled');
  });

  it('leaves the label of every other action alone', () => {
    const event = sample({ action: 'user.delete', targetLabel: 'victim@x.com' });
    expect(auditTargetLabel(event)).toBe('victim@x.com');
    expect(describeAuditEvent(event)).toBe('Deleted user victim@x.com');
  });

  it('shows an unknown status as itself rather than dropping it', () => {
    const event = sample({ action: 'contact.status_change', targetLabel: 'escalated' });
    expect(auditTargetLabel(event)).toBe('escalated');
  });

  it('falls back to the target id when a status-change event carries no label', () => {
    const event = sample({ action: 'privacy.request_update', targetLabel: undefined });
    expect(auditTargetLabel(event)).toBe('u-1');
  });
});

describe('AUDIT_SEVERITY_LABELS', () => {
  it('has a word for every severity AUDIT_META can produce', () => {
    for (const meta of Object.values(AUDIT_META)) {
      expect(AUDIT_SEVERITY_LABELS[meta.severity]).toBeTruthy();
    }
  });

  it('names the three severities distinctly', () => {
    const words = Object.values(AUDIT_SEVERITY_LABELS);
    expect(new Set(words).size).toBe(words.length);
  });
});

describe('AUDIT_TARGET_TYPE_LABELS', () => {
  it('has a word for every target kind, and none of them is the raw id', () => {
    for (const type of AUDIT_TARGET_TYPES) {
      const label = AUDIT_TARGET_TYPE_LABELS[type];
      expect(label).toBeTruthy();
      expect(label).not.toMatch(/_/);
    }
  });
});

describe('auditTargetLabel — the request type as a target label', () => {
  /**
   * Found by looking at the rendered screen rather than by reading the issue:
   * four privacy actions complete their phrase with `request.type`, and the
   * four type values are single lowercase words, so they read as prose and slip
   * past a snake_case check. "Authorized erasure for a data-subject request
   * erasure" was what the audit screen actually said.
   */
  it.each([
    ['privacy.request_create', 'Logged a data-subject request for Access'],
    ['privacy.subject_export', 'Exported the panel record for a data-subject request Access'],
    ['privacy.subject_erase_authorize', 'Authorized erasure for a data-subject request Access'],
    ['privacy.subject_erase', 'Erased the panel record for a data-subject request Access'],
  ] as const)('puts the request type into words for %s', (action, phrase) => {
    const event = sample({
      action: action as AuditEvent['action'],
      targetType: 'data_request',
      targetLabel: 'access',
    });
    expect(auditTargetLabel(event)).toBe('Access');
    expect(describeAuditEvent(event)).toBe(phrase);
  });

  it('resolves a type-carrying action against the type enum, not the status enum', () => {
    // `erasure` is a request type and exists in no status enum; a resolver
    // wired to the wrong map would return it unchanged and still pass above.
    const event = sample({ action: 'privacy.subject_erase', targetLabel: 'erasure' });
    expect(auditTargetLabel(event)).toBe('Erasure');
  });

  it('leaves every action with no recorded enum alone', () => {
    // The resolver table is keyed by action; an action outside it must fall
    // through to the raw label rather than being run through some default map.
    for (const action of Object.keys(AUDIT_META) as AuditEvent['action'][]) {
      if (action.startsWith('privacy.') || action === 'contact.status_change') continue;
      expect(auditTargetLabel(sample({ action, targetLabel: 'access' }))).toBe('access');
    }
  });
});
