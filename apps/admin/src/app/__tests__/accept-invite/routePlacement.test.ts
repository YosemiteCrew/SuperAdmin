/**
 * @jest-environment node
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('invite acceptance route placement', () => {
  it('lives outside the super-admin-only dashboard layout', () => {
    const appRoot = resolve(process.cwd(), 'src/app');

    expect(existsSync(resolve(appRoot, '(routes)/accept-invite/page.tsx'))).toBe(true);
    expect(existsSync(resolve(appRoot, '(routes)/(dashboard)/accept-invite/page.tsx'))).toBe(false);
  });
});
