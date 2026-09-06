jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/features/dataRequests/store', () => ({
  getDataRequest: jest.fn(),
}));

jest.mock('@/app/features/dataRequests/subjectData', () => ({
  collectSubjectData: jest.fn(),
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getDataRequest } from '@/app/features/dataRequests/store';
import { collectSubjectData } from '@/app/features/dataRequests/subjectData';
import { exportSubjectDataAction } from '@/app/(routes)/(dashboard)/privacy/requests/[id]/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockGetRequest = getDataRequest as jest.MockedFunction<typeof getDataRequest>;
const mockCollect = collectSubjectData as jest.MockedFunction<typeof collectSubjectData>;
const mockAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;

const REQUEST = {
  id: 'dr_1',
  subjectEmail: 'person@example.com',
  type: 'access',
  status: 'received',
  notes: null,
  receivedAt: new Date('2026-08-01T00:00:00.000Z'),
  dueAt: new Date('2026-08-31T00:00:00.000Z'),
  fulfilledAt: null,
  handledBy: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

const DOSSIER = {
  exportedAt: '2026-09-01T00:00:00.000Z',
  subjectEmail: 'person@example.com',
  lead: null,
  consent: [],
  dataRequests: [],
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
  mockCollect.mockResolvedValue(DOSSIER as never);
});

describe('exportSubjectDataAction', () => {
  it('enforces the super-admin gate before touching the register', async () => {
    mockRequireSuperAdmin.mockRejectedValue(new Error('not a super admin'));

    await expect(exportSubjectDataAction(formDataWith({ id: 'dr_1' }))).rejects.toThrow(
      'not a super admin'
    );
    expect(mockGetRequest).not.toHaveBeenCalled();
    expect(mockCollect).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing id', {}],
    ['an empty id', { id: '' }],
  ])('returns null for %s without exporting or auditing', async (_label, fields) => {
    const result = await exportSubjectDataAction(formDataWith(fields));

    expect(result).toBeNull();
    expect(mockCollect).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('returns null when the request id does not resolve', async () => {
    mockGetRequest.mockResolvedValue(null);

    const result = await exportSubjectDataAction(formDataWith({ id: 'gone' }));

    expect(result).toBeNull();
    expect(mockCollect).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  // The form carries several plausible field names, so this fails whichever one
  // an implementation reads. Planting a single key only pins that one key, and
  // a caller picking any other name would walk straight past the assertion.
  it('exports the address on the stored request, never one supplied by the caller', async () => {
    await exportSubjectDataAction(
      formDataWith({
        id: 'dr_1',
        subjectEmail: 'someone-else@example.com',
        email: 'someone-else@example.com',
        address: 'someone-else@example.com',
      })
    );

    expect(mockCollect).toHaveBeenCalledTimes(1);
    expect(mockCollect).toHaveBeenCalledWith('person@example.com');
  });

  it('follows the request row, so a different request exports a different subject', async () => {
    mockGetRequest.mockResolvedValue({
      ...REQUEST,
      id: 'dr_2',
      subjectEmail: 'another.person@example.net',
      type: 'erasure',
    } as never);

    await exportSubjectDataAction(formDataWith({ id: 'dr_2' }));

    expect(mockCollect).toHaveBeenCalledWith('another.person@example.net');
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: 'dr_2', targetLabel: 'erasure' })
    );
  });

  it('audits the export against the request row, and never the address', async () => {
    await exportSubjectDataAction(formDataWith({ id: 'dr_1' }));

    expect(mockAudit).toHaveBeenCalledWith({
      action: 'privacy.subject_export',
      actorId: 'admin_1',
      targetType: 'data_request',
      targetId: 'dr_1',
      targetLabel: 'access',
    });
    expect(JSON.stringify(mockAudit.mock.calls)).not.toContain('person@example.com');
  });

  it('audits before returning the payload', async () => {
    const order: string[] = [];
    mockCollect.mockImplementation(async () => {
      order.push('collect');
      return DOSSIER as never;
    });
    mockAudit.mockImplementation(async () => {
      order.push('audit');
    });

    const json = await exportSubjectDataAction(formDataWith({ id: 'dr_1' }));

    expect(order).toEqual(['collect', 'audit']);
    expect(json).not.toBeNull();
  });

  it('returns the dossier as indented JSON', async () => {
    const json = await exportSubjectDataAction(formDataWith({ id: 'dr_1' }));

    expect(json).toBe(JSON.stringify(DOSSIER, null, 2));
    expect(JSON.parse(json as string)).toEqual(DOSSIER);
  });
});
