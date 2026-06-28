import { buildSystemInfo, maskCoreHost } from '@/app/features/settings/systemInfo';

describe('maskCoreHost', () => {
  it('returns the host of a valid URI', () => {
    expect(maskCoreHost('https://abc123.aws.supertokens.io:3567')).toBe(
      'abc123.aws.supertokens.io:3567'
    );
  });

  it('returns a dash for empty or unparseable input', () => {
    expect(maskCoreHost(undefined)).toBe('—');
    expect(maskCoreHost('')).toBe('—');
    expect(maskCoreHost('not a uri')).toBe('—');
  });

  it('returns a dash when the URI parses but has no host', () => {
    expect(maskCoreHost('file:///etc/hosts')).toBe('—');
  });
});

describe('buildSystemInfo', () => {
  const base = {
    nodeEnv: 'production',
    buildSha: 'abcdef1234567',
    apiConfigured: true,
    coreHost: 'core.example.com',
    auditRetention: 250,
  };

  it('produces a labelled row per system field', () => {
    const rows = buildSystemInfo(base);
    const map = Object.fromEntries(rows.map((r) => [r.label, r.value]));
    expect(map.Environment).toBe('production');
    expect(map.Build).toBe('abcdef1'); // shortened to 7 chars
    expect(map['Organizations backend']).toBe('Connected');
    expect(map['SuperTokens core']).toBe('core.example.com');
    expect(map['Audit retention']).toBe('250 most-recent events');
  });

  it('falls back for missing env, no build sha, and unconfigured backend', () => {
    const rows = buildSystemInfo({
      ...base,
      nodeEnv: undefined,
      buildSha: undefined,
      apiConfigured: false,
    });
    const map = Object.fromEntries(rows.map((r) => [r.label, r.value]));
    expect(map.Environment).toBe('development');
    expect(map.Build).toBe('local');
    expect(map['Organizations backend']).toContain('Not configured');
  });
});
