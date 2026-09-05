/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A remote image host has to be allowed in two places or it does not work, and
 * the failure is silent in one direction and invisible in the other.
 *
 * `next.config.ts` decides what the image OPTIMIZER will fetch. The `img-src`
 * directive in `securityHeaders.ts` decides what the BROWSER will render. Allow
 * a host in the config alone and the optimizer happily fetches it while every
 * browser blocks the result; allow it in the CSP alone and the optimizer refuses
 * before the browser is ever asked. Neither mistake produces an error anyone
 * reads - the image is just missing.
 *
 * The reason this is a test and not a comment: what was in `next.config.ts`
 * before was `cdn.yourdomain.com`, a scaffold placeholder for a domain nobody
 * owns. It looked like configuration and was really a second lock on the image
 * optimizer, which is part of why GHSA-2xp9-vwfh-vxw4 - unauthenticated RCE via
 * AVIF in the Image Optimization API, fixed in next 16.3.3 - had no obvious path
 * into this panel. Whoever swaps in a real CDN removes that lock, and nothing
 * would have told them the CSP needed changing too.
 */

const ADMIN_ROOT = join(__dirname, '..', '..', '..', '..');
const NEXT_CONFIG = join(ADMIN_ROOT, 'next.config.ts');
const SECURITY_HEADERS = join(ADMIN_ROOT, 'src', 'securityHeaders.ts');

/** Hostnames `next/image` is configured to fetch from, via remotePatterns or the legacy domains list. */
export function configuredRemoteImageHosts(configSource: string): string[] {
  // Comments describe hosts without allowing them, so they must not count.
  const code = configSource
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  return [...code.matchAll(/hostname:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** Hosts the CSP will let the browser load an image from, ignoring 'self'/data:/blob:. */
export function cspImageHosts(headersSource: string): string[] {
  const directive = /["'`]img-src([^"'`]*)["'`]/.exec(headersSource);
  if (!directive) return [];
  return directive[1]
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !token.startsWith("'") && !token.endsWith(':'));
}

/** Hosts the optimizer would fetch that the browser would then refuse to render. */
export function hostsMissingFromCsp(remoteHosts: string[], allowedByCsp: string[]): string[] {
  return remoteHosts.filter(
    (host) => !allowedByCsp.some((allowed) => allowed === host || allowed.endsWith(`//${host}`))
  );
}

describe('remote image hosts agree with the CSP', () => {
  const configSource = readFileSync(NEXT_CONFIG, 'utf8');
  const headersSource = readFileSync(SECURITY_HEADERS, 'utf8');

  it('every configured remote image host is also allowed by img-src', () => {
    const remote = configuredRemoteImageHosts(configSource);
    const csp = cspImageHosts(headersSource);
    expect(hostsMissingFromCsp(remote, csp)).toEqual([]);
  });

  // The assertion above is vacuously true while no remote host is configured,
  // so on its own it would pass no matter how the comparison were written.
  // These give it a separating input: they prove the check can say "no".
  it('reports a host that next.config allows and the CSP does not', () => {
    expect(hostsMissingFromCsp(['images.example.com'], ['self'])).toEqual(['images.example.com']);
  });

  it('accepts a host that both allow', () => {
    expect(hostsMissingFromCsp(['images.example.com'], ['https://images.example.com'])).toEqual([]);
  });

  it('does not count a hostname that only appears in a comment', () => {
    const commented = "// remotePatterns: [{ hostname: 'cdn.example.com' }]\nconst a = 1;";
    expect(configuredRemoteImageHosts(commented)).toEqual([]);
  });

  it('reads the real img-src rather than returning an empty allowlist', () => {
    // Guards the parser itself: if this returned [] because the regex stopped
    // matching, the headline assertion would pass for the wrong reason.
    expect(headersSource).toContain('img-src');
    expect(cspImageHosts(headersSource)).toEqual([]);
    expect(configuredRemoteImageHosts(configSource)).toEqual([]);
  });
});
