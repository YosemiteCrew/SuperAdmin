jest.mock('server-only', () => ({}));
jest.mock('@superadmin/database', () => ({
  prisma: { contactLead: { upsert: jest.fn(), updateMany: jest.fn() } },
}));

import { prisma } from '@superadmin/database';
import {
  isHoneypotTripped,
  parseSubmission,
  recordContactSubmission,
} from '@/app/features/contact/intake';

const mockUpsert = prisma.contactLead.upsert as jest.Mock;
const mockUpdateMany = prisma.contactLead.updateMany as jest.Mock;

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

  it('never overwrites an existing name/company from the update branch', async () => {
    await recordContactSubmission({
      email: 'a@b.com',
      name: 'jane',
      company: 'newco',
      message: 'hi',
      newsletterConsent: false,
    });
    const arg = mockUpsert.mock.calls[0][0];
    // Update branch touches neither name nor company directly.
    expect(arg.update).not.toHaveProperty('name');
    expect(arg.update).not.toHaveProperty('company');
    // Backfill only fills the columns that are still null.
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { email: 'a@b.com', name: null },
      data: { name: 'jane' },
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { email: 'a@b.com', company: null },
      data: { company: 'newco' },
    });
  });

  it('skips the backfill when no name/company was provided', async () => {
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
