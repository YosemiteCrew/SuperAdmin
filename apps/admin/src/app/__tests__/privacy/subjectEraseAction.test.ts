jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/features/dataRequests/store', () => ({
  getDataRequest: jest.fn(),
}));

jest.mock('@/app/features/dataRequests/subjectErasure', () => ({
  eraseSubjectData: jest.fn(),
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getDataRequest } from '@/app/features/dataRequests/store';
import { eraseSubjectData } from '@/app/features/dataRequests/subjectErasure';
import { eraseSubjectDataAction } from '@/app/(routes)/(dashboard)/privacy/requests/[id]/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockGetRequest = getDataRequest as jest.MockedFunction<typeof getDataRequest>;
const mockErase = eraseSubjectData as jest.MockedFunction<typeof eraseSubjectData>;
const mockAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;

const REQUEST = {
  id: 'dr_1',
  subjectEmail: 'person@example.com',
  type: 'erasure',
  status: 'received',
  notes: null,
  receivedAt: new Date('2026-08-01T00:00:00.000Z'),
  dueAt: new Date('2026-08-31T00:00:00.000Z'),
  fulfilledAt: null,
  handledBy: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

const REPORT = {
  erasedAt: '2026-09-01T00:00:00.000Z',
  subjectEmail: 'person@example.com',
  deleted: { contactLeads: 1, contactRequests: 2 },
  retained: { consentSubjects: 1, consentEvents: 4, dataRequests: 1 },
};

function formDataWith(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin_1' });
  mockGetRequest.mockResolvedValue(REQUEST as never);
  mockErase.mockResolvedValue(REPORT as never);
});

describe('eraseSubjectDataAction', () => {
  it('enforces the super-admin gate before touching the register', async () => {
    mockRequireSuperAdmin.mockRejectedValue(new Error('not a super admin'));

    await expect(eraseSubjectDataAction(formDataWith({ id: 'dr_1' }))).rejects.toThrow(
      'not a super admin'
    );
    expect(mockGetRequest).not.toHaveBeenCalled();
    expect(mockErase).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing id', {}],
    ['an empty id', { id: '' }],
  ])('refuses %s without erasing or auditing', async (_label, fields) => {
    const result = await eraseSubjectDataAction(formDataWith(fields));

    expect(result).toBeNull();
    expect(mockErase).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('refuses an id that does not resolve', async () => {
    mockGetRequest.mockResolvedValue(null);

    await expect(eraseSubjectDataAction(formDataWith({ id: 'gone' }))).resolves.toBeNull();
    expect(mockErase).not.toHaveBeenCalled();
  });

  // The guard that separates this action from the export: an erasure is
  // irreversible, so it may only run for a request that asked for one.
  it.each([['access'], ['rectification'], ['objection']])(
    'refuses to erase for a %s request, and destroys nothing',
    async (type) => {
      mockGetRequest.mockResolvedValue({ ...REQUEST, type } as never);

      const result = await eraseSubjectDataAction(formDataWith({ id: 'dr_1' }));

      expect(result).toBeNull();
      expect(mockErase).not.toHaveBeenCalled();
      expect(mockAudit).not.toHaveBeenCalled();
    }
  );

  it('erases the address on the stored request, never one supplied by the caller', async () => {
    // Several plausible field names at once: planting a single key would pin
    // that one key and read as though it pinned the class.
    await eraseSubjectDataAction(
      formDataWith({
        id: 'dr_1',
        subjectEmail: 'someone-else@example.com',
        email: 'someone-else@example.com',
        address: 'someone-else@example.com',
      })
    );

    expect(mockErase).toHaveBeenCalledTimes(1);
    expect(mockErase).toHaveBeenCalledWith('person@example.com');
  });

  it('follows the request row, so a different request erases a different subject', async () => {
    mockGetRequest.mockResolvedValue({
      ...REQUEST,
      id: 'dr_2',
      subjectEmail: 'another.person@example.net',
    } as never);

    await eraseSubjectDataAction(formDataWith({ id: 'dr_2' }));

    expect(mockErase).toHaveBeenCalledWith('another.person@example.net');
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'dr_2' }));
  });

  it('audits against the request row at danger, and never the address', async () => {
    await eraseSubjectDataAction(formDataWith({ id: 'dr_1' }));

    expect(mockAudit).toHaveBeenCalledWith({
      action: 'privacy.subject_erase',
      actorId: 'admin_1',
      targetType: 'data_request',
      targetId: 'dr_1',
      targetLabel: 'erasure',
    });
    expect(JSON.stringify(mockAudit.mock.calls)).not.toContain('person@example.com');
  });

  it('audits after the erasure, so the log records one that happened', async () => {
    const order: string[] = [];
    mockErase.mockImplementation(async () => {
      order.push('erase');
      return REPORT as never;
    });
    mockAudit.mockImplementation(async () => {
      order.push('audit');
    });

    await eraseSubjectDataAction(formDataWith({ id: 'dr_1' }));

    expect(order).toEqual(['erase', 'audit']);
  });

  it('returns the report of what went and what stayed', async () => {
    await expect(eraseSubjectDataAction(formDataWith({ id: 'dr_1' }))).resolves.toEqual(REPORT);
  });
});
