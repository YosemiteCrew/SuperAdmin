import {
  CORROBORATION_META,
  checkWebsite,
  corroborateBusiness,
  isPublicHttpUrl,
} from '@/app/features/organizations/corroboration';
import type { SuperAdminOrganizationDetail } from '@/app/features/organizations/types';

function fetchReturning(res: Partial<Response> & { text?: () => Promise<string> }): typeof fetch {
  return jest.fn().mockResolvedValue(res) as unknown as typeof fetch;
}

function okHtml(html: string) {
  return { ok: true, status: 200, text: async () => html };
}

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
});

describe('checkWebsite', () => {
  it('skips when no website is provided', async () => {
    const res = await checkWebsite(undefined, 'Acme', fetchReturning(okHtml('')));
    expect(res.status).toBe('skipped');
  });

  it('fails for a present-but-invalid URL', async () => {
    const res = await checkWebsite('http://localhost', 'Acme', fetchReturning(okHtml('')));
    expect(res.status).toBe('fail');
  });

  it('passes when the page mentions the business name', async () => {
    const res = await checkWebsite(
      'https://acme.com',
      'Acme Veterinary',
      fetchReturning(okHtml('<h1>Welcome to Acme Veterinary clinic</h1>'))
    );
    expect(res.status).toBe('pass');
  });

  it('warns when the page does not mention the name', async () => {
    const res = await checkWebsite(
      'https://acme.com',
      'Acme Veterinary',
      fetchReturning(okHtml('<h1>Some unrelated parked domain</h1>'))
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
      fetchReturning(okHtml(html))
    );
    expect(res.status).toBe('warn');
  });

  it('matches the name in visible text even when an unterminated tag is present', async () => {
    const res = await checkWebsite(
      'https://acme.com',
      'Acme Veterinary',
      fetchReturning(okHtml('<h1>Acme Veterinary clinic <span'))
    );
    expect(res.status).toBe('pass');
  });

  it('fails on a non-OK response', async () => {
    const res = await checkWebsite(
      'https://acme.com',
      'Acme',
      fetchReturning({ ok: false, status: 404 })
    );
    expect(res.status).toBe('fail');
  });

  it('fails when the request throws', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    const res = await checkWebsite('https://acme.com', 'Acme', fetchImpl);
    expect(res.status).toBe('fail');
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
    const result = await corroborateBusiness(org, fetchReturning(okHtml('Acme Veterinary')));
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
    const result = await corroborateBusiness(org, fetchReturning(okHtml('parked domain')));
    expect(result.level).toBe('partial');
  });

  it('returns unverified for a sparse record with an unreachable website', async () => {
    const org = business({ website: 'https://acme.com' });
    const fetchImpl = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    const result = await corroborateBusiness(org, fetchImpl);
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
