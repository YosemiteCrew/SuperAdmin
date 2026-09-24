import { scalarSearchParam } from '@/app/lib/searchParams';

describe('scalarSearchParam', () => {
  it('keeps scalar values', () => {
    expect(scalarSearchParam('value')).toBe('value');
  });

  it.each([[undefined], [['first', 'second']]])('rejects %p', (value) => {
    expect(scalarSearchParam(value)).toBeUndefined();
  });
});
