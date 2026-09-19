jest.mock('server-only', () => ({}));
jest.mock('@superadmin/database', () => ({
  prisma: {
    contactLead: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    contactRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '@superadmin/database';
import {
  ContactIntakeConflictError,
  isHoneypotTripped,
  MAX_SUBMITTED_AT_SKEW_MS,
  parseSubmission,
  recordContactSubmission,
} from '@/app/features/contact/intake';

const LIMITS_SOURCE_REQUEST_ID = 100;

const mockUpsert = prisma.contactLead.upsert as jest.Mock;
const mockUpdateMany = prisma.contactLead.updateMany as jest.Mock;
const mockLeadFindUnique = prisma.contactLead.findUnique as jest.Mock;
const mockLeadFindUniqueOrThrow = prisma.contactLead.findUniqueOrThrow as jest.Mock;
const mockRequestFindUnique = prisma.contactRequest.findUnique as jest.Mock;
const mockRequestFindFirst = prisma.contactRequest.findFirst as jest.Mock;
const mockRequestUpdate = prisma.contactRequest.update as jest.Mock;
const mockRequestCreate = prisma.contactRequest.create as jest.Mock;
const mockRequestCreateMany = prisma.contactRequest.createMany as jest.Mock;
const mockTransaction = prisma.$transaction as unknown as jest.Mock;

const VALID = {
  email: 'Prospect@Clinic.com',
  name: '  Dr Smith  ',
  company: 'Happy Paws',
  subject: 'Demo request',
  message: '  We would like a demo.  ',
  newsletterConsent: true,
  sourceUrl: 'https://www.yosemitecrew.com/contact-us',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({});
  mockUpdateMany.mockResolvedValue({ count: 0 });
  mockLeadFindUnique.mockResolvedValue(null);
  mockLeadFindUniqueOrThrow.mockResolvedValue({ id: 'lead-1' });
  mockRequestFindUnique.mockReset();
  mockRequestFindUnique.mockResolvedValue(null);
  mockRequestFindFirst.mockResolvedValue(null);
  mockRequestUpdate.mockResolvedValue({});
  mockRequestCreate.mockResolvedValue({});
  mockRequestCreateMany.mockResolvedValue({ count: 1 });
  // The sourced path runs inside prisma.$transaction; the mock hands the
  // callback the same mocked client. Rollback itself is Prisma's behaviour and
  // is NOT asserted here — what these tests pin is that the work happens inside
  // the transaction callback, which is the part this module controls.
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
  mockUpsert.mockResolvedValue({ id: 'lead-1' });
});

describe('parseSubmission query-operator payloads', () => {
  // email reaches Prisma as a `where` value in recordContactSubmission,
  // including two updateMany calls whose where accepts FILTERS. If a non-string
  // ever got through, `{ not: 'x' }` would stop identifying one lead and start
  // matching every other one, so the name/company backfill would land on
  // strangers' rows. The endpoint is public, so the only thing standing in the
  // way is the typeof check in parseSubmission - pinned here rather than left
  // implicit.
  it.each([
    ['a not operator', { not: 'x' }],
    ['an equality operator', { equals: 'x' }],
    ['a contains operator', { contains: '@' }],
    ['a Mongo-style operator', { $ne: 5 }],
    ['an array', ['a@b.com']],
    ['a number', 5],
    ['null', null],
  ])('rejects the whole submission when email is %s', (_label, email) => {
    expect(parseSubmission({ ...VALID, email })).toBeNull();
  });

  // The erasure's reserved keys, refused here by the email shape check rather
  // than by a dedicated guard. Pinned so a future loosening of `looksLikeEmail`
  // cannot quietly let a lead be planted under an erased request's address.
  it.each([
    ['the bare marker', '[erased]'],
    ['a tombstone', '[erased]:cm0abc123'],
  ])('rejects %s as an email, since neither is address-shaped', (_label, email) => {
    expect(parseSubmission({ ...VALID, email })).toBeNull();
  });

  // Found by a surviving mutation while pinning the two above: neither half of
  // the `@` position check was covered, so `looksLikeEmail` could lose the `@`
  // requirement altogether and every test stayed green.
  it.each([
    ['no @ at all', 'ownerclinic.com'],
    ['an empty local part', '@clinic.com'],
    ['a trailing @', 'owner@'],
  ])('rejects an address with %s', (_label, email) => {
    expect(parseSubmission({ ...VALID, email })).toBeNull();
  });

  it('rejects a second @, matching the privacy request form', () => {
    expect(parseSubmission({ ...VALID, email: 'owner@a@clinic.com' })).toBeNull();
  });

  it('rejects the whole submission when message is a query operator', () => {
    expect(parseSubmission({ ...VALID, message: { not: 'x' } })).toBeNull();
  });

  it.each([['name'], ['company'], ['phone'], ['subject'], ['sourceUrl']])(
    'drops %s when it is a query operator rather than a string',
    (field) => {
      const s = parseSubmission({ ...VALID, [field]: { not: 'x' } });
      expect(s).not.toBeNull();
      expect(s?.[field as 'name' | 'company' | 'phone' | 'subject' | 'sourceUrl']).toBeUndefined();
    }
  );

  it.each([['fullName'], ['type']])(
    'drops the %s alias when it is a query operator rather than a string',
    (field) => {
      const s = parseSubmission({
        email: 'a@b.com',
        message: 'hello there',
        [field]: { not: 'x' },
      });
      expect(s).not.toBeNull();
      expect(s?.name).toBeUndefined();
      expect(s?.subject).toBeUndefined();
    }
  );
});

describe('parseSubmission marketing-site payload shape', () => {
  // The yosemitecrew.com contact form (forwarded verbatim by the site's
  // backend) sends fullName/type/phone rather than name/subject. Pinned here so
  // the panel keeps accepting the body the form actually produces.
  const MARKETING = {
    type: 'GENERAL_ENQUIRY',
    source: 'PMS_WEB',
    fullName: 'Lena Weber',
    email: 'Lena@Example.com',
    phone: '+49 152 277 63275',
    message: 'Which plan fits a two-vet clinic?',
  };

  it('maps fullName to name, type to a readable subject, and keeps phone', () => {
    expect(parseSubmission({ ...MARKETING })).toEqual({
      email: 'lena@example.com',
      name: 'Lena Weber',
      company: undefined,
      phone: '+49 152 277 63275',
      subject: 'General Enquiry',
      message: 'Which plan fits a two-vet clinic?',
      newsletterConsent: false,
      sourceUrl: undefined,
    });
  });

  it.each([
    ['FEATURE_REQUEST', 'Feature Request'],
    ['DSAR', 'Data Subject Access Request'],
    ['COMPLAINT', 'Complaint'],
  ])('maps the %s type to the label the visitor clicked', (type, subject) => {
    expect(parseSubmission({ ...MARKETING, type })?.subject).toBe(subject);
  });

  it.each([
    ['an unknown enum', 'SOMETHING_ELSE'],
    ['a prototype key', '__proto__'],
    ['a non-string', 42],
  ])('leaves subject unset when type is %s', (_label, type) => {
    expect(parseSubmission({ ...MARKETING, type })?.subject).toBeUndefined();
  });

  it('prefers an explicit name and subject over the fullName/type aliases', () => {
    const s = parseSubmission({ ...MARKETING, name: 'Dr Smith', subject: 'Demo request' });
    expect(s?.name).toBe('Dr Smith');
    expect(s?.subject).toBe('Demo request');
  });

  it('drops a blank or oversized phone', () => {
    expect(parseSubmission({ ...MARKETING, phone: '   ' })?.phone).toBeUndefined();
    expect(parseSubmission({ ...MARKETING, phone: '1'.repeat(51) })?.phone).toBeUndefined();
  });
});

describe('parseSubmission', () => {
  it('normalizes and trims a valid submission', () => {
    const s = parseSubmission({ ...VALID });
    expect(s).toEqual({
      email: 'prospect@clinic.com',
      name: 'Dr Smith',
      company: 'Happy Paws',
      subject: 'Demo request',
      message: 'We would like a demo.',
      newsletterConsent: true,
      sourceUrl: 'https://www.yosemitecrew.com/contact-us',
    });
  });

  it('defaults newsletterConsent to false unless strictly true', () => {
    expect(parseSubmission({ ...VALID, newsletterConsent: 'yes' })?.newsletterConsent).toBe(false);
    expect(parseSubmission({ ...VALID, newsletterConsent: undefined })?.newsletterConsent).toBe(
      false
    );
  });

  it('drops optional fields that are blank or oversized', () => {
    const s = parseSubmission({
      email: 'a@b.com',
      message: 'hello there',
      name: '   ',
      company: 'x'.repeat(201),
    });
    expect(s?.name).toBeUndefined();
    expect(s?.company).toBeUndefined();
  });

  it.each([
    ['missing email', { email: undefined }],
    ['non-string email', { email: 42 }],
    ['email without @', { email: 'nope' }],
    ['email without domain dot', { email: 'a@b' }],
    ['email with a space', { email: 'a b@c.com' }],
    ['email with non-space whitespace', { email: 'a\tb@c.com' }],
    ['oversized email', { email: `${'a'.repeat(250)}@b.com` }],
    ['missing message', { message: undefined }],
    ['blank message', { message: '   ' }],
    ['oversized message', { message: 'x'.repeat(5001) }],
  ])('rejects %s', (_label, over) => {
    expect(parseSubmission({ ...VALID, ...over })).toBeNull();
  });
});

describe('isHoneypotTripped', () => {
  it('is tripped when the hidden field has a value', () => {
    expect(isHoneypotTripped({ website: 'http://spam' })).toBe(true);
  });

  it('is not tripped when empty or absent', () => {
    expect(isHoneypotTripped({ website: '   ' })).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
  });
});

describe('recordContactSubmission', () => {
  it.each(['email', 'name', 'company', 'phone'] as const)(
    'rejects an object passed directly as %s before querying',
    async (field) => {
      await expect(
        recordContactSubmission({
          email: 'a@b.com',
          message: 'hi',
          newsletterConsent: false,
          [field]: { not: 'x' },
        } as unknown as Parameters<typeof recordContactSubmission>[0])
      ).rejects.toThrow('Contact submission contains invalid identity fields.');
      expect(mockUpsert).not.toHaveBeenCalled();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    }
  );

  it('upserts the lead and appends a request, recording consent time', async () => {
    await recordContactSubmission({
      email: 'a@b.com',
      message: 'hi',
      newsletterConsent: true,
      sourceUrl: 'https://www.yosemitecrew.com/contact-us',
    });

    const arg = mockUpsert.mock.calls[0][0];
    expect(arg.where).toEqual({ email: 'a@b.com' });
    expect(arg.create.newsletterConsent).toBe(true);
    expect(arg.create.consentAt).toBeInstanceOf(Date);
    expect(arg.create.consentSource).toBe('https://www.yosemitecrew.com/contact-us');
    expect(arg.create.requests.create.message).toBe('hi');
    // The update branch also appends a new request row.
    expect(arg.update.requests.create.message).toBe('hi');
  });

  it('never overwrites an existing name/company/phone from the update branch', async () => {
    await recordContactSubmission({
      email: 'a@b.com',
      name: 'jane',
      company: 'newco',
      phone: '+49 152 277 63275',
      message: 'hi',
      newsletterConsent: false,
    });
    const arg = mockUpsert.mock.calls[0][0];
    // Update branch touches none of name/company/phone directly.
    expect(arg.update).not.toHaveProperty('name');
    expect(arg.update).not.toHaveProperty('company');
    expect(arg.update).not.toHaveProperty('phone');
    // Backfill only fills the columns that are still null. The email is matched
    // with an explicit `equals` rather than a bare value: updateMany's where
    // accepts filters, so a bare value that turned out to be an object at
    // runtime would be read as one.
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { email: { equals: 'a@b.com' }, name: null },
      data: { name: 'jane' },
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { email: { equals: 'a@b.com' }, company: null },
      data: { company: 'newco' },
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { email: { equals: 'a@b.com' }, phone: null },
      data: { phone: '+49 152 277 63275' },
    });
  });

  it('stores the phone on a brand-new lead', async () => {
    await recordContactSubmission({
      email: 'a@b.com',
      phone: '+49 152 277 63275',
      message: 'hi',
      newsletterConsent: false,
    });
    expect(mockUpsert.mock.calls[0][0].create.phone).toBe('+49 152 277 63275');
  });

  it('skips the backfill when no name/company/phone was provided', async () => {
    await recordContactSubmission({ email: 'a@b.com', message: 'hi', newsletterConsent: false });
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('does not stamp consent when not opted in', async () => {
    await recordContactSubmission({ email: 'a@b.com', message: 'hi', newsletterConsent: false });
    const arg = mockUpsert.mock.calls[0][0];
    expect(arg.create.consentAt).toBeNull();
    expect(arg.update).not.toHaveProperty('consentAt');
  });

  it('falls back to a contact-us source label when none is given', async () => {
    await recordContactSubmission({ email: 'a@b.com', message: 'hi', newsletterConsent: true });
    expect(mockUpsert.mock.calls[0][0].create.consentSource).toBe('contact-us');
  });
});

// The idempotency key and the replayed timestamp both arrive from the public
// endpoint, and neither went through a bound before. Everything below drives
// the sourceRequestId branch, which no test reached until the prisma mock above
// grew a contactRequest: the branch was unreachable, not merely uncovered.
describe('parseSubmission idempotency inputs', () => {
  const ID = 'cmf0source0000abcdefghij';

  it('keeps a valid sourceRequestId, trimmed', () => {
    expect(parseSubmission({ ...VALID, sourceRequestId: `  ${ID}  ` })?.sourceRequestId).toBe(ID);
  });

  it('treats an absent sourceRequestId as undefined rather than rejecting', () => {
    expect(parseSubmission({ ...VALID })?.sourceRequestId).toBeUndefined();
  });

  // Rejected, not dropped. Dropping it would leave a submission that looks
  // ordinary and stores a SECOND row on the next redelivery.
  it.each([
    ['over the length limit', 'x'.repeat(LIMITS_SOURCE_REQUEST_ID + 1)],
    ['blank', '   '],
    ['a query operator', { not: 'x' }],
    ['a number', 5],
    ['an array', ['a']],
  ])('rejects the whole submission when sourceRequestId is %s', (_label, sourceRequestId) => {
    expect(parseSubmission({ ...VALID, sourceRequestId })).toBeNull();
  });

  it('accepts a sourceRequestId exactly at the limit', () => {
    const atLimit = 'x'.repeat(LIMITS_SOURCE_REQUEST_ID);
    expect(parseSubmission({ ...VALID, sourceRequestId: atLimit })?.sourceRequestId).toBe(atLimit);
  });

  it('accepts a historical submittedAt, which is what a backfill replays', () => {
    const past = '2024-03-01T10:00:00.000Z';
    expect(parseSubmission({ ...VALID, submittedAt: past })?.submittedAt).toEqual(new Date(past));
  });

  it('accepts a submittedAt inside the skew allowance', () => {
    const nearFuture = new Date(Date.now() + MAX_SUBMITTED_AT_SKEW_MS / 2).toISOString();
    expect(parseSubmission({ ...VALID, submittedAt: nearFuture })?.submittedAt).toBeInstanceOf(
      Date
    );
  });

  // An unparseable date used to reach prisma as an Invalid Date, and a far-future
  // one used to be stored verbatim.
  it.each([
    ['unparseable', 'not-a-date'],
    ['an empty string', ''],
    ['a number', 1_700_000_000_000],
    ['a Date instance rather than a string', new Date()],
  ])('rejects the whole submission when submittedAt is %s', (_label, submittedAt) => {
    expect(parseSubmission({ ...VALID, submittedAt })).toBeNull();
  });

  it('rejects a submittedAt beyond the skew allowance', () => {
    const farFuture = new Date(Date.now() + MAX_SUBMITTED_AT_SKEW_MS + 60_000).toISOString();
    expect(parseSubmission({ ...VALID, submittedAt: farFuture })).toBeNull();
  });
});

describe('recordContactSubmission with a sourceRequestId', () => {
  const ID = 'cmf0source0000abcdefghij';
  const EMAIL = 'a@b.com';
  const stored = (over: Record<string, unknown> = {}) => ({
    subject: null,
    message: 'hi',
    lead: { email: EMAIL },
    ...over,
  });
  const submission = (over: Record<string, unknown> = {}) => ({
    email: EMAIL,
    message: 'hi',
    newsletterConsent: false,
    sourceRequestId: ID,
    ...over,
  });

  it('does the whole sourced write inside one transaction', async () => {
    mockRequestFindUnique.mockResolvedValueOnce(null).mockResolvedValue(stored());
    await recordContactSubmission(submission());
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('stores nothing further when the id is already recorded with the same submission', async () => {
    mockRequestFindUnique.mockResolvedValue(stored());

    await recordContactSubmission(submission());

    expect(mockRequestCreateMany).not.toHaveBeenCalled();
    expect(mockRequestUpdate).not.toHaveBeenCalled();
  });

  it('refuses an id already recorded with a different message', async () => {
    mockRequestFindUnique.mockResolvedValue(stored({ message: 'a DIFFERENT message' }));

    await expect(recordContactSubmission(submission())).rejects.toBeInstanceOf(
      ContactIntakeConflictError
    );
    expect(mockRequestCreateMany).not.toHaveBeenCalled();
    expect(mockRequestUpdate).not.toHaveBeenCalled();
  });

  it('refuses an id already recorded with a different subject', async () => {
    mockRequestFindUnique.mockResolvedValue(stored({ subject: 'Old subject' }));

    await expect(
      recordContactSubmission(submission({ subject: 'New subject' }))
    ).rejects.toBeInstanceOf(ContactIntakeConflictError);
  });

  // The lead email is part of the identity. One product id arriving under two
  // addresses would otherwise file one visitor's message against another's
  // record and answer 200.
  it('refuses an id already recorded against a different lead email', async () => {
    mockRequestFindUnique.mockResolvedValue(stored({ lead: { email: 'someone-else@c.com' } }));

    await expect(recordContactSubmission(submission())).rejects.toBeInstanceOf(
      ContactIntakeConflictError
    );
    expect(mockRequestCreateMany).not.toHaveBeenCalled();
  });

  it('claims an unclaimed matching request without requiring its exact createdAt', async () => {
    mockRequestFindFirst.mockResolvedValue({ id: 'req-oldest' });

    await recordContactSubmission(
      submission({ submittedAt: new Date('2024-03-01T10:00:00.000Z') })
    );

    const where = mockRequestFindFirst.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('createdAt');
    expect(where).toMatchObject({ leadId: 'lead-1', sourceRequestId: null, message: 'hi' });
    expect(mockRequestCreateMany).not.toHaveBeenCalled();
  });

  it('claims the OLDEST candidate when several match', async () => {
    mockRequestFindFirst.mockResolvedValue({ id: 'req-oldest' });

    await recordContactSubmission(submission());

    expect(mockRequestFindFirst.mock.calls[0][0].orderBy).toEqual({ createdAt: 'asc' });
  });

  it('rewrites the claimed row createdAt to the replayed timestamp', async () => {
    mockRequestFindFirst.mockResolvedValue({ id: 'req-oldest' });
    const submittedAt = new Date('2024-03-01T10:00:00.000Z');

    await recordContactSubmission(submission({ submittedAt }));

    expect(mockRequestUpdate).toHaveBeenCalledWith({
      where: { id: 'req-oldest' },
      data: { sourceRequestId: ID, createdAt: submittedAt },
    });
  });

  // ON CONFLICT DO NOTHING, so two concurrent deliveries of one id cannot both
  // insert - the race is closed by the unique index, not by the read above it.
  it('inserts with skipDuplicates when nothing is claimable', async () => {
    mockRequestFindUnique.mockResolvedValueOnce(null).mockResolvedValue(stored());

    await recordContactSubmission(submission());

    const arg = mockRequestCreateMany.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data[0]).toMatchObject({ sourceRequestId: ID, leadId: 'lead-1', message: 'hi' });
  });

  it('accepts a concurrent duplicate that won the unique index', async () => {
    mockRequestCreateMany.mockResolvedValue({ count: 0 });
    mockRequestFindUnique.mockResolvedValueOnce(null).mockResolvedValue(stored());

    await expect(recordContactSubmission(submission())).resolves.toBeUndefined();
  });

  it('refuses when the concurrent winner stored a different submission', async () => {
    mockRequestCreateMany.mockResolvedValue({ count: 0 });
    mockRequestFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue(stored({ message: 'something else' }));

    await expect(recordContactSubmission(submission())).rejects.toBeInstanceOf(
      ContactIntakeConflictError
    );
  });

  it('refuses when the row vanished between insert and re-read', async () => {
    mockRequestFindUnique.mockResolvedValue(null);

    await expect(recordContactSubmission(submission())).rejects.toBeInstanceOf(
      ContactIntakeConflictError
    );
  });

  // A replayed submission can predate the lead we already hold. The guard is in
  // the where clause, so a NEWER submission leaves the lead's date alone.
  it('moves the lead createdAt back to an older submission time', async () => {
    const submittedAt = new Date('2024-03-01T10:00:00.000Z');
    mockRequestFindUnique.mockResolvedValueOnce(null).mockResolvedValue(stored());

    await recordContactSubmission(submission({ submittedAt }));

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'lead-1', createdAt: { gt: submittedAt } },
      data: { createdAt: submittedAt },
    });
  });

  it('fills only a null name, company and phone', async () => {
    mockRequestFindUnique.mockResolvedValueOnce(null).mockResolvedValue(stored());
    await recordContactSubmission(
      submission({ name: 'jane', company: 'newco', phone: '+49 152 277 63275' })
    );

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'lead-1', name: null },
      data: { name: 'jane' },
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'lead-1', phone: null },
      data: { phone: '+49 152 277 63275' },
    });
  });
});
