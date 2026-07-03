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
