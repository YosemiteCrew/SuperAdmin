import { parseDataRequestPrefill } from '@/app/features/dataRequests/prefill';

describe('parseDataRequestPrefill', () => {
  it('keeps a valid email and request type', () => {
    expect(parseDataRequestPrefill({ subjectEmail: 'jane@example.com', type: 'erasure' })).toEqual({
      subjectEmail: 'jane@example.com',
      type: 'erasure',
    });
  });

  it('trims a padded email', () => {
    expect(parseDataRequestPrefill({ subjectEmail: '  jane@example.com  ' })).toEqual({
      subjectEmail: 'jane@example.com',
      type: undefined,
    });
  });

  it.each([
    ['an invalid email', { subjectEmail: 'not-an-email' }],
    ['a repeated email param', { subjectEmail: ['a@b.com', 'c@d.com'] }],
    ['no email at all', {}],
  ])('drops %s', (_label, params) => {
    expect(parseDataRequestPrefill(params).subjectEmail).toBeUndefined();
  });

  it.each([
    ['an unknown type', { type: 'upcoding' }],
    ['a repeated type param', { type: ['access', 'erasure'] }],
    ['no type at all', {}],
  ])('drops %s', (_label, params) => {
    expect(parseDataRequestPrefill(params).type).toBeUndefined();
  });
});
