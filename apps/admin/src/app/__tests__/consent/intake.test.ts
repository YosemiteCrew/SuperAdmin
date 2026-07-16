import { parseConsentSubmission } from '@/app/features/consent/intake';

const VALID = {
  consentId: 'ph_distinct_123',
  source: 'web',
  decisions: [
    { category: 'analytics', granted: true },
    { category: 'marketing', granted: false },
  ],
  email: 'Owner@Clinic.com',
  policyVersion: 'v3',
};

describe('parseConsentSubmission query-operator payloads', () => {
  // consentId reaches Prisma as a `where` value in recordConsent, including an
  // updateMany whose where accepts FILTERS. If a non-string ever got through,
  // `{ not: 'x' }` would stop identifying one subject and start matching every
  // other one, so the identity-fill writes would land on strangers' rows. The
  // only thing standing between the public endpoint and that is the typeof
  // check in optionalString, so it is pinned here rather than left implicit.
  it.each([
    ['a not operator', { not: 'x' }],
    ['an equality operator', { equals: 'x' }],
    ['a startsWith operator', { startsWith: '' }],
    ['a Mongo-style operator', { $ne: 5 }],
    ['an array', ['a', 'b']],
    ['a number', 5],
    ['null', null],
    ['a nested object', { a: { b: 'c' } }],
  ])('rejects the whole submission when consentId is %s', (_label, consentId) => {
    expect(parseConsentSubmission({ ...VALID, consentId })).toBeNull();
  });

  it.each([
    ['userId', { not: 'x' }],
    ['email', { not: 'x' }],
  ])('drops %s when it is a query operator rather than a string', (field, value) => {
    const s = parseConsentSubmission({ ...VALID, [field]: value });
    expect(s).not.toBeNull();
    expect(s?.[field as 'userId' | 'email']).toBeUndefined();
  });

  it('rejects a submission whose decisions carry an operator object', () => {
    expect(
      parseConsentSubmission({ ...VALID, decisions: [{ category: { not: 'x' }, granted: true }] })
    ).toBeNull();
  });
});

describe('parseConsentSubmission', () => {
  it('parses and normalizes a valid submission', () => {
    const s = parseConsentSubmission({ ...VALID }, 'Mozilla/5.0');
    expect(s).toEqual({
      consentId: 'ph_distinct_123',
      source: 'web',
      decisions: [
        { category: 'analytics', granted: true },
        { category: 'marketing', granted: false },
      ],
      email: 'owner@clinic.com',
      userId: undefined,
      policyVersion: 'v3',
      userAgent: 'Mozilla/5.0',
    });
  });

  it('dedupes repeated categories, last decision winning', () => {
    const s = parseConsentSubmission(
      {
        consentId: 'c1',
        source: 'mobile',
        decisions: [
          { category: 'analytics', granted: true },
          { category: 'analytics', granted: false },
        ],
      },
      undefined
    );
    expect(s?.decisions).toEqual([{ category: 'analytics', granted: false }]);
  });

  it.each([
    ['missing consentId', { consentId: undefined }],
    ['blank consentId', { consentId: '   ' }],
    ['unknown source', { source: 'tv' }],
    ['missing source', { source: undefined }],
    ['empty decisions', { decisions: [] }],
    ['non-array decisions', { decisions: 'analytics' }],
    ['unknown category', { decisions: [{ category: 'ads', granted: true }] }],
    ['non-boolean granted', { decisions: [{ category: 'analytics', granted: 'yes' }] }],
    ['too many decisions', { decisions: Array(9).fill({ category: 'analytics', granted: true }) }],
  ])('rejects %s', (_label, over) => {
    expect(parseConsentSubmission({ ...VALID, ...over })).toBeNull();
  });

  it('drops an oversized policy version but keeps the submission', () => {
    const s = parseConsentSubmission({ ...VALID, policyVersion: 'x'.repeat(51) });
    expect(s?.policyVersion).toBeUndefined();
  });

  it('carries userId when the caller knows the account', () => {
    const s = parseConsentSubmission({ ...VALID, userId: 'user-9' });
    expect(s?.userId).toBe('user-9');
  });
});
