jest.mock('@/app/config', () => ({
  config: {
    api: {
      baseUrl: 'https://api.example.com',
      baseUrls: {
        production: 'https://api.example.com',
        development: 'https://devapi.example.com',
      },
      timeout: 30_000,
    },
  },
}));

import {
  API_ENVIRONMENTS,
  API_ENVIRONMENT_META,
  DEFAULT_API_ENVIRONMENT,
  apiBaseUrl,
  appendApiEnvironment,
  isApiEnvironmentConfigured,
  parseApiEnvironment,
} from '@/app/config/apiEnvironment';

describe('parseApiEnvironment', () => {
  it.each(API_ENVIRONMENTS)('accepts the known environment %s', (env) => {
    expect(parseApiEnvironment(env)).toBe(env);
  });

  it('defaults to production for an unknown value', () => {
    // Failing open to production would be the dangerous direction here only if
    // the label lied; the page always renders the environment it resolved.
    expect(parseApiEnvironment('staging')).toBe('production');
  });

  it('defaults to production when absent', () => {
    expect(parseApiEnvironment(undefined)).toBe(DEFAULT_API_ENVIRONMENT);
  });

  it('takes the first entry when the param is repeated', () => {
    expect(parseApiEnvironment(['development', 'production'])).toBe('development');
  });

  it('defaults when a repeated param leads with junk', () => {
    expect(parseApiEnvironment(['nope', 'development'])).toBe('production');
  });
});

describe('apiBaseUrl', () => {
  it('resolves each environment to its own host', () => {
    expect(apiBaseUrl('production')).toBe('https://api.example.com');
    expect(apiBaseUrl('development')).toBe('https://devapi.example.com');
  });

  it('never returns the same host for both environments in this fixture', () => {
    expect(apiBaseUrl('production')).not.toBe(apiBaseUrl('development'));
  });
});

describe('isApiEnvironmentConfigured', () => {
  it('is true when a base URL is present', () => {
    expect(isApiEnvironmentConfigured('production')).toBe(true);
    expect(isApiEnvironmentConfigured('development')).toBe(true);
  });
});

describe('appendApiEnvironment', () => {
  it('omits the default so production URLs stay clean', () => {
    const qs = new URLSearchParams();
    appendApiEnvironment(qs, 'production');
    expect(qs.toString()).toBe('');
  });

  it('writes the param for a non-default environment', () => {
    const qs = new URLSearchParams();
    appendApiEnvironment(qs, 'development');
    expect(qs.get('env')).toBe('development');
  });
});

describe('API_ENVIRONMENT_META', () => {
  it('has a label and hint for every environment', () => {
    for (const env of API_ENVIRONMENTS) {
      expect(API_ENVIRONMENT_META[env].label.length).toBeGreaterThan(0);
      expect(API_ENVIRONMENT_META[env].hint.length).toBeGreaterThan(0);
    }
  });
});
