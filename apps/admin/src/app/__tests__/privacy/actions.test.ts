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

import { revalidatePath } from 'next/cache';
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
const mockRevalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

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
    ['more than one @', 'owner@a@clinic.com'],
    ['no dot in domain', 'person@localhost'],
    ['trailing dot in domain', 'person@example.'],
    ['contains whitespace', 'person @example.com'],
    ['contains non-space whitespace', 'person\t@example.com'],
  ])('rejects an invalid email (%s)', async (_label, email) => {
    const result = await logDataRequestAction(
      makeFormData({ subjectEmail: email, type: 'access' })
    );
    expect(result).toEqual({ ok: false, error: 'A valid subject email is required' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Same reserved namespace as the public intakes, refused here by the `@` check.
  // A request logged under `[erased]` would match every erased row at once.
  it.each([
    ['the bare marker', '[erased]'],
    ['a tombstone', '[erased]:cm0abc123'],
  ])('refuses to log a request for %s', async (_label, subjectEmail) => {
    const result = await logDataRequestAction(makeFormData({ subjectEmail, type: 'access' }));
    expect(result.ok).toBe(false);
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
      makeFormData({
        subjectEmail: 'a@b.com',
        type: 'access',
        notes: 'hi',
        receivedOn: '2026-03-01',
      })
    );

    expect(result).toEqual({ ok: true });
    expect(mockCreate).toHaveBeenCalledWith({
      subjectEmail: 'a@b.com',
      type: 'access',
      notes: 'hi',
      receivedAt: new Date('2026-03-01T00:00:00.000Z'),
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

  it.each([
    ['missing', undefined],
    ['not ISO', '03/01/2026'],
    ['not a real calendar date', '2026-02-30'],
  ])('rejects a %s received date', async (_label, receivedOn) => {
    const fields: Record<string, string> = { subjectEmail: 'a@b.com', type: 'access' };
    if (receivedOn) fields.receivedOn = receivedOn;

    const result = await logDataRequestAction(makeFormData(fields));

    expect(result).toEqual({ ok: false, error: 'Enter the date the request was received' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // The subject's email must not be denormalised into the audit log: the log has
  // no erasure workflow, so honouring an erasure request would otherwise leave
  // the requester's address behind in it. The DataRequest row behind targetId is
  // the thing that holds the email and the thing erasure deletes.
  it('never writes the subject email into the audit trail', async () => {
    mockCreate.mockResolvedValue({ id: 'dr_9', subjectEmail: 'subject@person.com' } as never);
    await logDataRequestAction(
      makeFormData({
        subjectEmail: 'subject@person.com',
        type: 'erasure',
        receivedOn: '2026-03-01',
      })
    );

    const [event] = mockAudit.mock.calls[0];
    expect(JSON.stringify(event)).not.toContain('subject@person.com');
    expect(JSON.stringify(event)).not.toContain('@');
    expect(event.targetId).toBe('dr_9');
  });

  it('passes undefined notes when the field is absent', async () => {
    mockCreate.mockResolvedValue({ id: 'dr_2', subjectEmail: 'a@b.com' } as never);
    await logDataRequestAction(
      makeFormData({ subjectEmail: 'a@b.com', type: 'erasure', receivedOn: '2026-03-01' })
    );
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
    const result = await updateDataRequestStatusAction(
      makeFormData({ status: 'fulfilled', expectedStatus: 'in_progress' })
    );
    expect(result).toEqual({ ok: false, error: 'A request id is required' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unknown status', async () => {
    const result = await updateDataRequestStatusAction(
      makeFormData({ id: 'dr_1', status: 'archived', expectedStatus: 'in_progress' })
    );
    expect(result).toEqual({ ok: false, error: 'Unknown status' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unknown expected status', async () => {
    const result = await updateDataRequestStatusAction(
      makeFormData({ id: 'dr_1', status: 'fulfilled', expectedStatus: 'archived' })
    );
    expect(result).toEqual({ ok: false, error: 'Unknown status' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates the status, audits it, and returns ok', async () => {
    mockUpdate.mockResolvedValue({ ok: true });

    const result = await updateDataRequestStatusAction(
      makeFormData({ id: 'dr_1', status: 'fulfilled', expectedStatus: 'in_progress' })
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'dr_1',
      status: 'fulfilled',
      expectedStatus: 'in_progress',
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
    mockUpdate.mockResolvedValue({ ok: true });
    await updateDataRequestStatusAction(
      makeFormData({ id: 'dr_1', status: 'fulfilled', expectedStatus: 'in_progress' })
    );

    const [event] = mockAudit.mock.calls[0];
    expect(JSON.stringify(event)).not.toContain('subject@person.com');
    expect(JSON.stringify(event)).not.toContain('@');
  });

  // Another admin already moved this request between page-load and this
  // submit. The store made no write (it returns ok:false), so this must not
  // record an audit event for a change that never happened, and must surface
  // a message the operator can act on instead of a generic "ok".
  it('reports a clear error and records no audit event when the write is stale', async () => {
    mockUpdate.mockResolvedValue({ ok: false, currentStatus: 'fulfilled' });

    const result = await updateDataRequestStatusAction(
      makeFormData({ id: 'dr_1', status: 'in_progress', expectedStatus: 'received' })
    );

    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/already updated/i);
    expect(mockAudit).not.toHaveBeenCalled();
    expect(mockRevalidate).toHaveBeenCalledWith('/privacy/requests');
  });
});
