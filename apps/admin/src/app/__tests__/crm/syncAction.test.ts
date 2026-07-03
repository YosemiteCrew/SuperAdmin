jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

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
import { syncContactsAction } from '@/app/(routes)/(dashboard)/crm/actions';

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
