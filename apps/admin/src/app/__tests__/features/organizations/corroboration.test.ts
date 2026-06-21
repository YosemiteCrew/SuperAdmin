import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  CORROBORATION_META,
  checkWebsite,
  corroborateBusiness,
  createPinnedFetch,
  type HostResolver,
  isPublicHttpUrl,
  pinningLookup,
} from '@/app/features/organizations/corroboration';
import type { SuperAdminOrganizationDetail } from '@/app/features/organizations/types';

function fetchReturning(res: Partial<Response> & { text?: () => Promise<string> }): typeof fetch {
  return jest.fn().mockResolvedValue(res) as unknown as typeof fetch;
}

function okHtml(html: string) {
  return { ok: true, status: 200, text: async () => html };
}

function redirectTo(
  location: string | null,
  status = 302
): Partial<Response> & { text?: () => Promise<string> } {
  return {
    ok: false,
    status,
    headers: {
      get: (h: string) => (h.toLowerCase() === 'location' ? location : null),
    } as unknown as Headers,
  };
}

// Default resolver used in tests: every hostname maps to a public IP.
const publicResolver: HostResolver = async () => [{ address: '93.184.216.34' }];

// Mocks the real node:dns resolver so the default-resolver path is covered
// without hitting the network.
const lookupMock = jest.fn();
jest.mock('node:dns/promises', () => ({
  lookup: (...args: unknown[]) => lookupMock(...args),
}));

beforeEach(() => {
  lookupMock.mockReset().mockResolvedValue([{ address: '93.184.216.34' }]);
});

function business(over: Partial<SuperAdminOrganizationDetail>): SuperAdminOrganizationDetail {
  return {
    id: 'o1',
    name: 'Acme Veterinary',
    type: 'HOSPITAL',
    isVerified: false,
    isActive: true,
    memberCount: 3,
    createdAt: '2026-01-01',
    ...over,
  };
}

describe('isPublicHttpUrl', () => {
  it('accepts public http(s) URLs and prepends https to bare domains', () => {
    expect(isPublicHttpUrl('https://acme.com')?.hostname).toBe('acme.com');
    expect(isPublicHttpUrl('http://acme.com')?.protocol).toBe('http:');
    expect(isPublicHttpUrl('acme.com')?.protocol).toBe('https:');
  });

  it('rejects empty, malformed, and non-http schemes', () => {
    expect(isPublicHttpUrl(undefined)).toBeNull();
    expect(isPublicHttpUrl('   ')).toBeNull();
    expect(isPublicHttpUrl('ftp://acme.com')).toBeNull();
    expect(isPublicHttpUrl('javascript:alert(1)')).toBeNull();
    expect(isPublicHttpUrl('http://')).toBeNull(); // unparseable → URL ctor throws
  });

  it('rejects loopback, private, and link-local hosts (SSRF guard)', () => {
    for (const host of [
      'http://localhost',
      'https://api.internal',
      'https://printer.local',
      'http://127.0.0.1',
      'http://10.0.0.5',
      'http://192.168.1.1',
      'http://172.16.0.1',
      'http://169.254.1.1',
      'http://[::1]',
      'http://[fd00::1]',
    ]) {
      expect(isPublicHttpUrl(host)).toBeNull();
    }
  });

  it('rejects alternate IP encodings and reserved ranges', () => {
    for (const host of [
      'http://2130706433', // decimal 127.0.0.1
      'http://0x7f000001', // hex 127.0.0.1
      'http://0177.0.0.1', // octal 127.0.0.1
      'http://[::ffff:127.0.0.1]', // IPv4-mapped IPv6 loopback
      'http://[::ffff:169.254.0.1]', // IPv4-mapped link-local
      'http://0.0.0.0', // unspecified
      'http://100.64.0.1', // CGNAT 100.64/10
      'http://224.0.0.1', // multicast
    ]) {
      expect(isPublicHttpUrl(host)).toBeNull();
    }
  });
});

describe('checkWebsite', () => {
  it('skips when no website is provided', async () => {
    const res = await checkWebsite(undefined, 'Acme', fetchReturning(okHtml('')), publicResolver);
    expect(res.status).toBe('skipped');
  });

  it('fails for a present-but-invalid URL', async () => {
    const res = await checkWebsite(
      'http://localhost',
      'Acme',
      fetchReturning(okHtml('')),
      publicResolver
    );
    expect(res.status).toBe('fail');
  });

  it('passes when the page mentions the business name', async () => {
    const res = await checkWebsite(
      'https://acme.com',
      'Acme Veterinary',
      fetchReturning(okHtml('<h1>Welcome to Acme Veterinary clinic</h1>')),
      publicResolver
    );
    expect(res.status).toBe('pass');
  });

  it('warns when the page does not mention the name', async () => {
    const res = await checkWebsite(
      'https://acme.com',
      'Acme Veterinary',
      fetchReturning(okHtml('<h1>Some unrelated parked domain</h1>')),
      publicResolver
    );
    expect(res.status).toBe('warn');
  });

  it('ignores the business name when it only appears inside script/style blocks', async () => {
    const html =
      '<style>.acme-veterinary { color: red }</style>' +
      '<script>const acme = "Acme Veterinary";</script>' +
      '<h1>Welcome to our parked domain</h1>';
    const res = await checkWebsite(
      'https://acme.com',
      'Acme Veterinary',
      fetchReturning(okHtml(html)),
      publicResolver
    );
    expect(res.status).toBe('warn');
  });

  it('matches the name in visible text even when an unterminated tag is present', async () => {
    const res = await checkWebsite(
      'https://acme.com',
      'Acme Veterinary',
      fetchReturning(okHtml('<h1>Acme Veterinary clinic <span')),
      publicResolver
    );
    expect(res.status).toBe('pass');
  });

  it('fails on a non-OK response', async () => {
    const res = await checkWebsite(
      'https://acme.com',
      'Acme',
      fetchReturning({ ok: false, status: 404 }),
      publicResolver
    );
    expect(res.status).toBe('fail');
  });

  it('fails when the request throws', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    const res = await checkWebsite('https://acme.com', 'Acme', fetchImpl, publicResolver);
    expect(res.status).toBe('fail');
  });

  it('follows a safe redirect to another public URL and passes', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(redirectTo('https://www.acme.com/'))
      .mockResolvedValueOnce(okHtml('Acme Veterinary')) as unknown as typeof fetch;
    const res = await checkWebsite(
      'https://acme.com',
      'Acme Veterinary',
      fetchImpl,
      publicResolver
    );
    expect(res.status).toBe('pass');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('blocks a redirect to a private/metadata host (SSRF)', async () => {
    const fetchImpl = fetchReturning(redirectTo('http://169.254.169.254/latest/meta-data/'));
    const res = await checkWebsite('https://acme.com', 'Acme', fetchImpl, publicResolver);
    expect(res.status).toBe('fail');
  });

  it('blocks a redirect with no Location header', async () => {
    const fetchImpl = fetchReturning(redirectTo(null, 301));
    const res = await checkWebsite('https://acme.com', 'Acme', fetchImpl, publicResolver);
    expect(res.status).toBe('fail');
  });

  it('fails when the hostname resolves to a private IP (DNS rebinding)', async () => {
    const privateResolver: HostResolver = async () => [{ address: '127.0.0.1' }];
    const fetchImpl = fetchReturning(okHtml('Acme'));
    const res = await checkWebsite('https://acme.com', 'Acme', fetchImpl, privateResolver);
    expect(res.status).toBe('fail');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails when the hostname resolves to no addresses', async () => {
    const emptyResolver: HostResolver = async () => [];
    const res = await checkWebsite(
      'https://acme.com',
      'Acme',
      fetchReturning(okHtml('Acme')),
      emptyResolver
    );
    expect(res.status).toBe('fail');
  });

  it('stops after too many redirects', async () => {
    const fetchImpl = fetchReturning(redirectTo('https://acme.com/loop'));
    const res = await checkWebsite('https://acme.com', 'Acme', fetchImpl, publicResolver);
    expect(res.status).toBe('fail');
  });

  it('uses the real DNS resolver by default', async () => {
    const res = await checkWebsite('https://acme.com', 'Acme', fetchReturning(okHtml('Acme')));
    expect(res.status).toBe('pass');
    expect(lookupMock).toHaveBeenCalledWith('acme.com', { all: true });
  });
});

describe('corroborateBusiness', () => {
  it('returns corroborated for a complete business with a matching website', async () => {
    const org = business({
      website: 'https://acme.com',
      phoneNo: '+1 555 0100',
      address: { addressLine: '1 Main St', city: 'Townsville', country: 'US' },
      taxId: 'TAX-1',
      healthAndSafetyCertNo: 'HS-1',
      googlePlacesId: 'gp-1',
    });
    const result = await corroborateBusiness(
      org,
      fetchReturning(okHtml('Acme Veterinary')),
      publicResolver
    );
    expect(result.level).toBe('corroborated');
    expect(result.checks).toHaveLength(6);
  });

  it('returns partial when the website does not match but the record is complete', async () => {
    const org = business({
      website: 'https://acme.com',
      phoneNo: '+1 555 0100',
      address: { addressLine: '1 Main St', city: 'Townsville', country: 'US' },
      taxId: 'TAX-1',
      googlePlacesId: 'gp-1',
    });
    const result = await corroborateBusiness(
      org,
      fetchReturning(okHtml('parked domain')),
      publicResolver
    );
    expect(result.level).toBe('partial');
  });

  it('returns unverified for a sparse record with an unreachable website', async () => {
    const org = business({ website: 'https://acme.com' });
    const fetchImpl = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    const result = await corroborateBusiness(org, fetchImpl, publicResolver);
    expect(result.level).toBe('unverified');
  });
});

describe('CORROBORATION_META', () => {
  it('has a label and badge class for every level', () => {
    for (const meta of Object.values(CORROBORATION_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.badgeClass.length).toBeGreaterThan(0);
    }
  });
});

describe('createPinnedFetch', () => {
  function listen(
    handler: Parameters<typeof createServer>[1]
  ): Promise<{ server: Server; port: number }> {
    return new Promise((resolve) => {
      const server = createServer(handler);
      // Bind all interfaces so both `127.0.0.1` and `localhost` reach it.
      server.listen(0, () => {
        resolve({ server, port: (server.address() as AddressInfo).port });
      });
    });
  }

  // `() => false` makes the pin permit loopback so a local server is reachable.
  const allowLoopback = createPinnedFetch(() => false);

  it('resolves a hostname, pins the connection, and reads the body', async () => {
    const { server, port } = await listen((_req, res) => {
      res.statusCode = 200;
      res.end('<h1>Acme Veterinary</h1>');
    });
    try {
      // A hostname (not an IP literal) exercises the validating/pinning lookup.
      const res = await allowLoopback(`http://localhost:${port}/`);
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
      expect(await res.text()).toContain('Acme Veterinary');
    } finally {
      server.close();
    }
  });

  it('returns a redirect response without following it (and reads array headers)', async () => {
    const { server, port } = await listen((_req, res) => {
      res.statusCode = 302;
      res.setHeader('location', 'https://example.com/');
      res.setHeader('set-cookie', ['a=1', 'b=2']);
      res.end();
    });
    try {
      const res = await allowLoopback(`http://127.0.0.1:${port}/`);
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe('https://example.com/');
      expect(res.headers.get('set-cookie')).toBe('a=1');
      expect(res.headers.get('x-absent')).toBeNull();
    } finally {
      server.close();
    }
  });

  it('rejects when the resolved address is blocked by the default guard', async () => {
    // A hostname (not an IP literal) forces node to call our validating lookup,
    // which resolves localhost → 127.0.0.1 and rejects it.
    await expect(createPinnedFetch()('http://localhost:9/')).rejects.toThrow();
  });

  it('rejects an oversized response body', async () => {
    const { server, port } = await listen((_req, res) => {
      res.statusCode = 200;
      res.end('x'.repeat(2_000_001));
    });
    try {
      await expect(allowLoopback(`http://127.0.0.1:${port}/`)).rejects.toThrow();
    } finally {
      server.close();
    }
  });

  it('selects the https transport for https URLs', async () => {
    await expect(allowLoopback('https://127.0.0.1:9/')).rejects.toThrow();
  });

  it('rejects when an aborted signal is supplied', async () => {
    const { server, port } = await listen((_req, res) => {
      res.statusCode = 200;
      res.end('ok');
    });
    try {
      await expect(
        allowLoopback(`http://127.0.0.1:${port}/`, { signal: AbortSignal.abort() })
      ).rejects.toThrow();
    } finally {
      server.close();
    }
  });

  it('rejects when the hostname does not resolve', async () => {
    await expect(allowLoopback('http://does-not-exist.invalid/')).rejects.toThrow();
  });
});

describe('pinningLookup', () => {
  type LookupCb = (err: Error | null, address: unknown, family?: unknown) => void;
  type Resolve = (h: string, o: object, cb: LookupCb) => void;
  const asResolve = (fn: Resolve) => fn as unknown as Parameters<typeof pinningLookup>[1];

  function run(isBlocked: (ip: string) => boolean, resolve: Resolve) {
    const fn = pinningLookup(isBlocked, asResolve(resolve)) as unknown as Resolve;
    return new Promise<{ err: Error | null; address: unknown }>((done) => {
      fn('host.example', {}, (err, address) => done({ err, address }));
    });
  }

  it('forwards a DNS error', async () => {
    const { err } = await run(
      () => false,
      (_h, _o, cb) => cb(new Error('ENOTFOUND'), undefined)
    );
    expect(err?.message).toBe('ENOTFOUND');
  });

  it('passes through a single public address', async () => {
    const { err, address } = await run(
      () => false,
      (_h, _o, cb) => cb(null, '93.184.216.34', 4)
    );
    expect(err).toBeNull();
    expect(address).toBe('93.184.216.34');
  });

  it('passes through an all:true list of public addresses', async () => {
    const list = [{ address: '93.184.216.34', family: 4 }];
    const { err, address } = await run(
      () => false,
      (_h, _o, cb) => cb(null, list)
    );
    expect(err).toBeNull();
    expect(address).toBe(list);
  });

  it('blocks when any resolved address is private', async () => {
    const { err } = await run(
      (ip) => ip.startsWith('10.'),
      (_h, _o, cb) =>
        cb(null, [
          { address: '93.184.216.34', family: 4 },
          { address: '10.0.0.1', family: 4 },
        ])
    );
    expect(err?.message).toMatch(/blocked non-public/);
  });
});
