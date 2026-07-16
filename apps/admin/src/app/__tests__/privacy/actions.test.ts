jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/features/dataRequests/store', () => ({
  createDataRequest: jest.fn(),
  updateDataRequestStatus: jest.fn(),
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { createDataRequest, updateDataRequestStatus } from '@/app/features/dataRequests/store';
import {
  logDataRequestAction,
  updateDataRequestStatusAction,
} from '@/app/(routes)/(dashboard)/privacy/requests/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockCreate = createDataRequest as jest.MockedFunction<typeof createDataRequest>;
const mockUpdate = updateDataRequestStatus as jest.MockedFunction<typeof updateDataRequestStatus>;
const mockAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin_1' } as never);
});

describe('logDataRequestAction', () => {
  it.each([
    ['missing @', 'not-an-email'],
    ['nothing before @', '@example.com'],
    ['nothing after @', 'person@'],
    ['no dot in domain', 'person@localhost'],
    ['trailing dot in domain', 'person@example.'],
    ['contains whitespace', 'person @example.com'],
  ])('rejects an invalid email (%s)', async (_label, email) => {
    const result = await logDataRequestAction(
      makeFormData({ subjectEmail: email, type: 'access' })
    );
    expect(result).toEqual({ ok: false, error: 'A valid subject email is required' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown request type', async () => {
    const result = await logDataRequestAction(
      makeFormData({ subjectEmail: 'a@b.com', type: 'deletion' })
    );
    expect(result.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates the request, audits it, and returns ok', async () => {
    mockCreate.mockResolvedValue({ id: 'dr_1', subjectEmail: 'a@b.com' } as never);

    const result = await logDataRequestAction(
      makeFormData({ subjectEmail: 'a@b.com', type: 'access', notes: 'hi' })
    );

    expect(result).toEqual({ ok: true });
    expect(mockCreate).toHaveBeenCalledWith({
      subjectEmail: 'a@b.com',
      type: 'access',
      notes: 'hi',
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.request_create',
        actorId: 'admin_1',
        targetType: 'data_request',
        targetId: 'dr_1',
        targetLabel: 'access',
      })
    );
  });

  // The subject's email must not be denormalised into the audit log: the log has
  // no erasure workflow, so honouring an erasure request would otherwise leave
  // the requester's address behind in it. The DataRequest row behind targetId is
  // the thing that holds the email and the thing erasure deletes.
  it('never writes the subject email into the audit trail', async () => {
    mockCreate.mockResolvedValue({ id: 'dr_9', subjectEmail: 'subject@person.com' } as never);
    await logDataRequestAction(
      makeFormData({ subjectEmail: 'subject@person.com', type: 'erasure' })
    );

    const [event] = mockAudit.mock.calls[0];
    expect(JSON.stringify(event)).not.toContain('subject@person.com');
    expect(JSON.stringify(event)).not.toContain('@');
    expect(event.targetId).toBe('dr_9');
  });

  it('passes undefined notes when the field is absent', async () => {
    mockCreate.mockResolvedValue({ id: 'dr_2', subjectEmail: 'a@b.com' } as never);
    await logDataRequestAction(makeFormData({ subjectEmail: 'a@b.com', type: 'erasure' }));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ notes: undefined }));
  });

  it('propagates when the caller is not a super-admin', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(new Error('forbidden'));
    await expect(
      logDataRequestAction(makeFormData({ subjectEmail: 'a@b.com', type: 'access' }))
    ).rejects.toThrow('forbidden');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('updateDataRequestStatusAction', () => {
  it('rejects a missing id', async () => {
    const result = await updateDataRequestStatusAction(makeFormData({ status: 'fulfilled' }));
    expect(result).toEqual({ ok: false, error: 'A request id is required' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unknown status', async () => {
    const result = await updateDataRequestStatusAction(
      makeFormData({ id: 'dr_1', status: 'archived' })
    );
    expect(result).toEqual({ ok: false, error: 'Unknown status' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates the status, audits it, and returns ok', async () => {
    mockUpdate.mockResolvedValue({ id: 'dr_1', subjectEmail: 'a@b.com' } as never);

    const result = await updateDataRequestStatusAction(
      makeFormData({ id: 'dr_1', status: 'fulfilled' })
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'dr_1',
      status: 'fulfilled',
      handledBy: 'admin_1',
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.request_update',
        actorId: 'admin_1',
        targetType: 'data_request',
        targetId: 'dr_1',
        targetLabel: 'fulfilled',
      })
    );
  });

  it('never writes the subject email into the audit trail on update', async () => {
    mockUpdate.mockResolvedValue({ id: 'dr_1', subjectEmail: 'subject@person.com' } as never);
    await updateDataRequestStatusAction(makeFormData({ id: 'dr_1', status: 'fulfilled' }));

    const [event] = mockAudit.mock.calls[0];
    expect(JSON.stringify(event)).not.toContain('subject@person.com');
    expect(JSON.stringify(event)).not.toContain('@');
  });
});
