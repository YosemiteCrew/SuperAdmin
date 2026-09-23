jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    plunkApiKey: 'test-key',
    plunkApiEndpoint: 'https://api.useplunk.com',
    yosemiteBackendUrl: 'https://backend.example.com',
    yosemiteBackfillKey: 'test-backfill-key',
  },
}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/features/crm/recipients', () => ({
  fetchRecipientEmails: jest.fn(),
}));

jest.mock('@/app/features/crm/plunk', () => ({
  isPlunkConfigured: jest.fn(),
  syncContacts: jest.fn(),
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { isPlunkConfigured, syncContacts } from '@/app/features/crm/plunk';
import { fetchRecipientEmails } from '@/app/features/crm/recipients';
import { syncContactsAction, backfillContactsAction } from '@/app/(routes)/(dashboard)/crm/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockConfigured = isPlunkConfigured as jest.MockedFunction<typeof isPlunkConfigured>;
const mockFetch = fetchRecipientEmails as jest.MockedFunction<typeof fetchRecipientEmails>;
const mockSync = syncContacts as jest.MockedFunction<typeof syncContacts>;
const mockAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin-1' });
  mockConfigured.mockReturnValue(true);
  mockFetch.mockResolvedValue(['a@b.com', 'c@d.com']);
  mockSync.mockResolvedValue({ synced: 2, failed: 0 });
  mockAudit.mockResolvedValue(undefined);
});

describe('syncContactsAction', () => {
  it('does not inspect config, sync, or audit when the caller is not a super admin', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    await expect(syncContactsAction()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockConfigured).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSync).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('syncs all contacts and returns counts', async () => {
    const result = await syncContactsAction();
    expect(mockSync).toHaveBeenCalledWith(['a@b.com', 'c@d.com']);
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('records an audit event with the sync outcome', async () => {
    mockSync.mockResolvedValue({ synced: 1, failed: 1 });
    await syncContactsAction();
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'crm.contact_sync',
        targetType: 'system',
        targetId: 'plunk',
        targetLabel: 'Plunk (1 synced, 1 failed)',
      })
    );
  });

  it('errors cleanly when the contact fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('core down'));
    const result = await syncContactsAction();
    expect(result.error).toMatch(/Failed to fetch/);
    expect(mockSync).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('errors when there are no contacts', async () => {
    mockFetch.mockResolvedValue([]);
    const result = await syncContactsAction();
    expect(result.error).toMatch(/No contacts/);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it('refuses up front when Plunk is not configured', async () => {
    mockConfigured.mockReturnValue(false);
    const result = await syncContactsAction();
    expect(result.error).toMatch(/not configured/i);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSync).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });
});

describe('backfillContactsAction', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin-1' });
    mockAudit.mockResolvedValue(undefined);
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it('backfills contacts and returns counts', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ forwarded: 5, skipped: 2, failed: 0 }),
    });

    const result = await backfillContactsAction();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://backend.example.com/v1/super-admin/contact-backfill',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-backfill-key': 'test-backfill-key',
        }),
      })
    );
    expect(result.forwarded).toBe(5);
    expect(result.skipped).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('records an audit event with the backfill outcome', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ forwarded: 3, skipped: 1, failed: 0 }),
    });

    await backfillContactsAction();

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'crm.contact_backfill',
        targetType: 'system',
        targetId: 'yosemite-crew',
        targetLabel: 'Yosemite-Crew (3 forwarded, 1 skipped, 0 failed)',
      })
    );
  });

  it('errors cleanly when the backend request throws', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));

    const result = await backfillContactsAction();

    expect(result.error).toMatch(/network down/);
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('errors when backend returns non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal server error' }),
    });

    const result = await backfillContactsAction();

    expect(result.error).toMatch(/Internal server error/);
    expect(mockAudit).not.toHaveBeenCalled();
  });
});
