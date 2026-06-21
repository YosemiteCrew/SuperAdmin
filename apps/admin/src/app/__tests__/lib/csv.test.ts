import { escapeCsvField, rowsToCsv } from '@/app/lib/csv';

describe('escapeCsvField', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('quotes values containing a comma', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  it('doubles and quotes embedded quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes values containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('leaves an empty field untouched', () => {
    expect(escapeCsvField('')).toBe('');
  });

  it.each(['=', '+', '-', '@', '\t', '\r'])('neutralizes a leading formula trigger %j', (ch) => {
    expect(escapeCsvField(`${ch}cmd`)).toBe(`'${ch}cmd`);
  });

  it('neutralizes and then quotes a formula that also contains a comma', () => {
    expect(escapeCsvField('=HYPERLINK("x"),y')).toBe('"\'=HYPERLINK(""x""),y"');
  });

  it('does not neutralize a trigger char that is not first', () => {
    expect(escapeCsvField('a=b')).toBe('a=b');
  });
});

describe('rowsToCsv', () => {
  it('emits a header-only string for no rows', () => {
    expect(rowsToCsv(['A', 'B'], [])).toBe('A,B');
  });

  it('stringifies numbers and escapes fields', () => {
    const csv = rowsToCsv(['Name', 'Count'], [['Acme, Inc', 3]]);
    expect(csv).toBe('Name,Count\n"Acme, Inc",3');
  });
});
