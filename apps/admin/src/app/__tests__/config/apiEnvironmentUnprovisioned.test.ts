/**
 * The unprovisioned host lives in its own file on purpose: `jest.mock` is hoisted
 * per module registry, so a second base-URL fixture cannot be swapped in from
 * inside the main suite (`doMock` loses to the hoisted factory even under
 * `isolateModulesAsync`).
 */
jest.mock('@/app/config', () => ({
  config: {
    api: { baseUrl: '', baseUrls: { production: '', development: '' }, timeout: 30_000 },
  },
}));

import { apiBaseUrl, isApiEnvironmentConfigured } from '@/app/config/apiEnvironment';

describe('an environment with no base URL', () => {
  it('reports itself unconfigured', () => {
    // The switcher greys out the tab on the strength of this; without it the tab
    // navigates and the page dies with "Failed to parse URL from /v1/...".
    expect(isApiEnvironmentConfigured('production')).toBe(false);
    expect(isApiEnvironmentConfigured('development')).toBe(false);
  });

  it('resolves to an empty base URL rather than undefined', () => {
    expect(apiBaseUrl('production')).toBe('');
    expect(apiBaseUrl('development')).toBe('');
  });
});
