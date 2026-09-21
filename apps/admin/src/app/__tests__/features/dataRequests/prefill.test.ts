import { parseDataRequestLink } from '@/app/features/dataRequests/prefill';

describe('parseDataRequestLink', () => {
  it('keeps a valid email and request type', () => {
    expect(parseDataRequestLink({ fromContact: 'ckq1a2b3c4d5', type: 'erasure' })).toEqual({
      fromContact: 'ckq1a2b3c4d5',
      type: 'erasure',
    });
  });

  it('trims a padded email', () => {
    expect(parseDataRequestLink({ fromContact: 'ckq1a2b3c4d5' })).toEqual({
      fromContact: 'ckq1a2b3c4d5',
      type: undefined,
    });
  });

  it.each([
    ['an id with characters an id cannot contain', { fromContact: 'jane@example.com' }],
    ['a repeated id param', { fromContact: ['abc', 'def'] }],
    ['no email at all', {}],
  ])('drops %s', (_label, params) => {
    expect(parseDataRequestLink(params).fromContact).toBeUndefined();
  });

  it.each([
    ['an unknown type', { type: 'upcoding' }],
    ['a repeated type param', { type: ['access', 'erasure'] }],
    ['no type at all', {}],
  ])('drops %s', (_label, params) => {
    expect(parseDataRequestLink(params).type).toBeUndefined();
  });
});
