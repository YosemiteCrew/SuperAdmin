jest.mock('@superadmin/database', () => ({
  prisma: {
    contactLead: { findUnique: jest.fn() },
    consentSubject: { findMany: jest.fn() },
    dataRequest: { findMany: jest.fn() },
  },
}));

import { prisma } from '@superadmin/database';

import { collectSubjectData, normalizeSubjectEmail } from '@/app/features/dataRequests/subjectData';
import { isSectionError } from '@/app/lib/exportSection';

const mockLead = prisma.contactLead.findUnique as jest.MockedFunction<
  typeof prisma.contactLead.findUnique
>;
const mockConsent = prisma.consentSubject.findMany as jest.MockedFunction<
  typeof prisma.consentSubject.findMany
>;
const mockRequests = prisma.dataRequest.findMany as jest.MockedFunction<
  typeof prisma.dataRequest.findMany
>;

const LEAD_ROW = {
  id: 'lead_1',
  email: 'person@example.com',
  name: 'A Person',
  company: null,
  phone: '+1 555 0100',
  newsletterConsent: true,
  consentAt: new Date('2026-07-01T09:00:00.000Z'),
  consentSource: 'https://www.example.com/contact-us',
  createdAt: new Date('2026-06-01T08:00:00.000Z'),
  updatedAt: new Date('2026-07-01T09:00:00.000Z'),
  requests: [
    {
      id: 'cr_1',
      leadId: 'lead_1',
      subject: 'Pricing',
      message: 'How much?',
      sourceUrl: 'https://www.example.com/contact-us',
      status: 'new',
      handledBy: 'admin_7',
      createdAt: new Date('2026-06-01T08:00:00.000Z'),
      updatedAt: new Date('2026-06-01T08:00:00.000Z'),
    },
  ],
};

const CONSENT_ROWS = [
  {
    id: 'cs_1',
    consentId: 'device-abc',
    userId: 'user_9',
    email: 'person@example.com',
    createdAt: new Date('2026-05-02T10:00:00.000Z'),
    updatedAt: new Date('2026-05-02T10:00:00.000Z'),
    events: [
      {
        id: 'ce_2',
        seq: BigInt(2),
        subjectId: 'cs_1',
        category: 'marketing',
        granted: false,
        source: 'web',
        policyVersion: 'v3',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date('2026-06-02T10:00:00.000Z'),
      },
    ],
  },
];

const REQUEST_ROWS = [
  {
    id: 'dr_1',
    subjectEmail: 'person@example.com',
    type: 'access',
    status: 'received',
    notes: 'Verified by passport copy',
    receivedAt: new Date('2026-08-01T00:00:00.000Z'),
    dueAt: new Date('2026-08-31T00:00:00.000Z'),
    fulfilledAt: null,
    handledBy: 'admin_7',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  },
];

function resolveAll() {
  mockLead.mockResolvedValue(LEAD_ROW as never);
  mockConsent.mockResolvedValue(CONSENT_ROWS as never);
  mockRequests.mockResolvedValue(REQUEST_ROWS as never);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('normalizeSubjectEmail', () => {
  it.each([
    ['  Person@Example.COM ', 'person@example.com'],
    ['person@example.com', 'person@example.com'],
    ['\tPERSON@EXAMPLE.COM\n', 'person@example.com'],
  ])('normalizes %j', (input, expected) => {
    expect(normalizeSubjectEmail(input)).toBe(expected);
  });
});

// `string` is erased at runtime, and the normalized value goes straight into a
// Prisma `where`. An object arriving here would be read as query operators
// rather than as a value, which turns a lookup for one person into a lookup for
// everyone — and on the erasure path into a mass delete.
describe('normalizeSubjectEmail rejects a non-string', () => {
  // Asserting the message, not just `TypeError`. Most of these also make
  // `.trim()` throw a TypeError of its own, so a test that accepts any
  // TypeError passes with the guard deleted and reads as though it checked it.
  it.each([
    ['an operator object', { not: '' }],
    ['an array', ['a@example.com']],
    ['null', null],
    ['a number', 42],
  ])('throws on %s rather than passing it to a query', (_label, value) => {
    expect(() => normalizeSubjectEmail(value as never)).toThrow('Subject email must be a string.');
  });

  // The separating input: an object that survives `.trim().toLowerCase()` and
  // would reach Prisma as query operators. Nothing but an explicit type check
  // stops this one, which is what the guard is for.
  it('throws on an object that imitates a string and would reach the query as operators', () => {
    const imposter = { trim: () => ({ toLowerCase: () => ({ not: '' }) }) };

    expect(() => normalizeSubjectEmail(imposter as never)).toThrow(
      'Subject email must be a string.'
    );
  });
});

describe('collectSubjectData', () => {
  it('queries every table with the normalized address, not the raw input', async () => {
    resolveAll();

    const data = await collectSubjectData('  Someone.Else@Example.COM ');

    expect(data.subjectEmail).toBe('someone.else@example.com');
    expect(mockLead).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'someone.else@example.com' } })
    );
    expect(mockConsent).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'someone.else@example.com' } })
    );
    expect(mockRequests).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subjectEmail: 'someone.else@example.com' } })
    );
  });

  it('maps the lead and its submissions, and discloses no third-party handler', async () => {
    resolveAll();

    const data = await collectSubjectData('person@example.com');

    expect(isSectionError(data.lead)).toBe(false);
    const lead = data.lead as Exclude<typeof data.lead, { error: string } | null>;
    expect(lead.name).toBe('A Person');
    expect(lead.consentSource).toBe('https://www.example.com/contact-us');
    expect(lead.consentAt).toBe('2026-07-01T09:00:00.000Z');
    expect(lead.createdAt).toBe('2026-06-01T08:00:00.000Z');
    expect(lead.requests).toHaveLength(1);
    expect(lead.requests[0]).toEqual({
      id: 'cr_1',
      subject: 'Pricing',
      message: 'How much?',
      sourceUrl: 'https://www.example.com/contact-us',
      status: 'new',
      createdAt: '2026-06-01T08:00:00.000Z',
    });
    // The admin who actioned the message is a third party (Art. 15(4)).
    expect(JSON.stringify(data)).not.toContain('admin_7');
  });

  it('reports a null lead when the address is not a lead, without failing the section', async () => {
    mockLead.mockResolvedValue(null as never);
    mockConsent.mockResolvedValue([] as never);
    mockRequests.mockResolvedValue([] as never);

    const data = await collectSubjectData('nobody@example.com');

    expect(data.lead).toBeNull();
    expect(isSectionError(data.lead)).toBe(false);
  });

  it('maps consent subjects with their full event history', async () => {
    resolveAll();

    const data = await collectSubjectData('person@example.com');

    const consent = data.consent as Exclude<typeof data.consent, { error: string }>;
    expect(consent).toHaveLength(1);
    expect(consent[0].consentId).toBe('device-abc');
    expect(consent[0].userId).toBe('user_9');
    expect(consent[0].events).toEqual([
      {
        category: 'marketing',
        granted: false,
        source: 'web',
        policyVersion: 'v3',
        userAgent: 'Mozilla/5.0',
        at: '2026-06-02T10:00:00.000Z',
      },
    ]);
  });

  it('maps prior rights requests and keeps the controller notes', async () => {
    resolveAll();

    const data = await collectSubjectData('person@example.com');

    const requests = data.dataRequests as Exclude<typeof data.dataRequests, { error: string }>;
    expect(requests).toEqual([
      {
        id: 'dr_1',
        type: 'access',
        status: 'received',
        notes: 'Verified by passport copy',
        receivedAt: '2026-08-01T00:00:00.000Z',
        dueAt: '2026-08-31T00:00:00.000Z',
        fulfilledAt: null,
      },
    ]);
  });

  it('isolates a failing read to its own section and still returns the rest', async () => {
    resolveAll();
    mockConsent.mockRejectedValue(new Error('connection terminated'));

    const data = await collectSubjectData('person@example.com');

    expect(isSectionError(data.consent)).toBe(true);
    expect(isSectionError(data.lead)).toBe(false);
    expect(isSectionError(data.dataRequests)).toBe(false);
    // The driver message must not reach a document handed to a data subject.
    expect(JSON.stringify(data)).not.toContain('connection terminated');
  });

  it('reports every section that failed when the database is unreachable', async () => {
    const down = new Error('down');
    mockLead.mockRejectedValue(down);
    mockConsent.mockRejectedValue(down);
    mockRequests.mockRejectedValue(down);

    const data = await collectSubjectData('person@example.com');

    expect(isSectionError(data.lead)).toBe(true);
    expect(isSectionError(data.consent)).toBe(true);
    expect(isSectionError(data.dataRequests)).toBe(true);
    expect(data.subjectEmail).toBe('person@example.com');
  });

  it('caps every section so one prolific address cannot exhaust memory', async () => {
    resolveAll();

    await collectSubjectData('person@example.com');

    expect(mockConsent).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
    expect(mockRequests).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
    expect(mockLead).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { requests: expect.objectContaining({ take: 500 }) },
      })
    );
  });
});
