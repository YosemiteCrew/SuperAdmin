import { isValidEmail } from '@/app/features/settings/email';

describe('isValidEmail', () => {
  it.each(['a@b.com', 'first.last@sub.example.co.uk', 'admin@yosemitecrew.com'])(
    'accepts %s',
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    }
  );

  it.each([
    ['', 'empty'],
    ['   ', 'whitespace only'],
    ['no-at-sign', 'no @'],
    ['a@@b.com', 'double @'],
    ['@b.com', 'empty local part'],
    ['a@b', 'domain too short'],
    ['a@bcd', 'domain without a dot'],
    ['a@b.', 'trailing dot in domain'],
    ['a b@c.com', 'contains a space'],
  ])('rejects %s (%s)', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it('rejects an over-long address', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@b.com`)).toBe(false);
  });
});
