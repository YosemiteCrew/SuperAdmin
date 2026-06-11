import { cn } from '@/app/lib/cn';

describe('cn', () => {
  it('joins truthy class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('skips falsy values', () => {
    expect(cn('foo', null, undefined, false, 'bar')).toBe('foo bar');
  });

  it('respects object syntax from clsx', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('flattens nested arrays', () => {
    expect(cn(['foo', ['bar', { baz: true }]])).toBe('foo bar baz');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});
