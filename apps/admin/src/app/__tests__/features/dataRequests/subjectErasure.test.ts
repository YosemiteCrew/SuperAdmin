// The retained tables carry a working `deleteMany` deliberately. A double that
// simply omits it would make "the ledger is never deleted" pass by throwing a
// TypeError in a test that never runs the line — the assertion has to be able
// to observe a call that could have succeeded.
const tx = {
  contactRequest: { count: jest.fn() },
  consentSubject: {
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  consentEvent: { count: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  dataRequest: { count: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  contactLead: { deleteMany: jest.fn() },
};

jest.mock('@superadmin/database', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

import { prisma } from '@superadmin/database';

import { ERASED_SUBJECT, eraseSubjectData } from '@/app/features/dataRequests/subjectErasure';

const mockTransaction = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;

/** Order in which the transaction body touched the client, for ordering assertions. */
let calls: string[] = [];

function record(name: string, fn: jest.Mock, value: unknown) {
  fn.mockImplementation(async () => {
    calls.push(name);
    return value;
  });
}

function resolveAll({
  contactRequests = 2,
  consentSubjectIds = ['cs_1', 'cs_2'],
  consentEvents = 5,
  dataRequests = 3,
  deletedLeads = 1,
  updatedSubjects = 2,
} = {}) {
  record('contactRequest.count', tx.contactRequest.count, contactRequests);
  record(
    'consentSubject.findMany',
    tx.consentSubject.findMany,
    consentSubjectIds.map((id) => ({ id }))
  );
  record('consentEvent.count', tx.consentEvent.count, consentEvents);
  record('dataRequest.count', tx.dataRequest.count, dataRequests);
  record('contactLead.deleteMany', tx.contactLead.deleteMany, { count: deletedLeads });
  record('consentSubject.updateMany', tx.consentSubject.updateMany, { count: updatedSubjects });
  record('consentSubject.update', tx.consentSubject.update, {});
  record('consentEvent.updateMany', tx.consentEvent.updateMany, { count: consentEvents });
  record('dataRequest.updateMany', tx.dataRequest.updateMany, { count: dataRequests });
  record('consentSubject.deleteMany', tx.consentSubject.deleteMany, { count: 0 });
  record('consentEvent.deleteMany', tx.consentEvent.deleteMany, { count: 0 });
  record('dataRequest.deleteMany', tx.dataRequest.deleteMany, { count: 0 });
}

beforeEach(() => {
  jest.clearAllMocks();
  calls = [];
  mockTransaction.mockImplementation((async (fn: (client: typeof tx) => unknown) =>
    fn(tx)) as never);
  resolveAll();
});

describe('eraseSubjectData', () => {
  it('runs every read and write inside one transaction, so a partial erasure cannot land', async () => {
    await eraseSubjectData('person@example.com');

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // Nothing may be reached through a client other than the transaction one.
    expect(Object.keys(prisma)).toEqual(['$transaction']);
  });

  it('deletes the lead and nulls the consent identifiers, keyed by the normalized address', async () => {
    await eraseSubjectData('  Person@Example.COM ');

    // `{ equals: … }` rather than a bare value: a second layer under the
    // normalizer's type check, so a non-string is rejected as a value instead
    // of being read as query operators.
    expect(tx.contactLead.deleteMany).toHaveBeenCalledWith({
      where: { email: { equals: 'person@example.com' } },
    });
    expect(tx.consentSubject.findMany).toHaveBeenCalledWith({
      where: { email: { equals: 'person@example.com' } },
      select: { id: true },
    });
    // `consentId` is `@unique` and non-nullable, so it is tombstoned per row.
    // The replacement is derived from the row id, never from the erased value.
    for (const id of ['cs_1', 'cs_2']) {
      expect(tx.consentSubject.update).toHaveBeenCalledWith({
        where: { id },
        data: { email: null, userId: null, consentId: `${ERASED_SUBJECT}:${id}` },
      });
    }
  });

  // Art. 7(1) needs the category, decision, source, policy version and time.
  // It does not need a fingerprint of the browser that made the decision.
  it('strips the user-agent from every retained consent event', async () => {
    await eraseSubjectData('person@example.com');

    expect(tx.consentEvent.updateMany).toHaveBeenCalledWith({
      where: { subjectId: { in: ['cs_1', 'cs_2'] } },
      data: { userAgent: null },
    });
  });

  // The row proves a request of this type was answered in time. The address and
  // the controller's free-text notes about the person are not part of that.
  it('strips the address and the notes from every retained rights request', async () => {
    await eraseSubjectData('person@example.com');

    expect(tx.dataRequest.updateMany).toHaveBeenCalledWith({
      where: { subjectEmail: { equals: 'person@example.com' } },
      data: { subjectEmail: ERASED_SUBJECT, notes: null },
    });
  });

  it('leaves no identifier behind on any retained row', async () => {
    await eraseSubjectData('person@example.com');

    // Everything written to a retained table, flattened. The address must not
    // survive anywhere in it, and every identifying column must be addressed.
    const written = JSON.stringify([
      tx.consentSubject.update.mock.calls,
      tx.consentEvent.updateMany.mock.calls,
      tx.dataRequest.updateMany.mock.calls,
    ]);
    const data = [
      ...tx.consentSubject.update.mock.calls.map((c) => (c[0] as { data: object }).data),
      ...tx.consentEvent.updateMany.mock.calls.map((c) => (c[0] as { data: object }).data),
      ...tx.dataRequest.updateMany.mock.calls.map((c) => (c[0] as { data: object }).data),
    ];
    const keys = new Set(data.flatMap((d) => Object.keys(d)));

    expect(keys).toEqual(
      new Set(['email', 'userId', 'consentId', 'userAgent', 'subjectEmail', 'notes'])
    );
    // The address survives only as the lookup key, never as a written value.
    expect(written).toContain('person@example.com');
    expect(JSON.stringify(data)).not.toContain('person@example.com');
  });

  it('never deletes the consent ledger or the rights requests', async () => {
    await eraseSubjectData('person@example.com');

    // The proof that consent was obtained, and the proof this request was
    // answered. Both survive an erasure by design.
    expect(tx.consentSubject.deleteMany).not.toHaveBeenCalled();
    expect(tx.consentEvent.deleteMany).not.toHaveBeenCalled();
    expect(tx.dataRequest.deleteMany).not.toHaveBeenCalled();
    // The control: the one table that IS deleted, so this is not passing
    // because nothing was deleted at all.
    expect(tx.contactLead.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('counts what it will remove before removing it, or the counts read as zero', async () => {
    await eraseSubjectData('person@example.com');

    expect(calls.indexOf('contactRequest.count')).toBeLessThan(
      calls.indexOf('contactLead.deleteMany')
    );
    expect(calls.indexOf('consentSubject.findMany')).toBeLessThan(
      calls.indexOf('consentSubject.update')
    );
    expect(calls.indexOf('consentEvent.count')).toBeLessThan(
      calls.indexOf('consentSubject.update')
    );
    // The address is read out of every DataRequest row, so the count has to
    // precede the write that replaces it with the tombstone.
    expect(calls.indexOf('dataRequest.count')).toBeLessThan(
      calls.indexOf('dataRequest.updateMany')
    );
    // Every index above must be a real position, never a -1 from a call that
    // stopped happening — a rename would otherwise satisfy `toBeLessThan`.
    for (const name of [
      'contactRequest.count',
      'contactLead.deleteMany',
      'consentSubject.findMany',
      'consentSubject.update',
      'consentEvent.count',
      'dataRequest.count',
      'dataRequest.updateMany',
    ]) {
      expect(calls).toContain(name);
    }
  });

  it('reports what was deleted and what was retained', async () => {
    const report = await eraseSubjectData('person@example.com');

    expect(report).toEqual({
      erasedAt: expect.any(String),
      subjectEmail: 'person@example.com',
      deleted: { contactLeads: 1, contactRequests: 2 },
      retained: { consentSubjects: 2, consentEvents: 5, dataRequests: 3 },
    });
  });

  it('reports zeroes rather than failing when the panel holds nothing for the address', async () => {
    resolveAll({
      contactRequests: 0,
      consentSubjectIds: [],
      consentEvents: 0,
      dataRequests: 1,
      deletedLeads: 0,
      updatedSubjects: 0,
    });

    const report = await eraseSubjectData('nobody@example.com');

    expect(report.deleted).toEqual({ contactLeads: 0, contactRequests: 0 });
    expect(report.retained).toEqual({ consentSubjects: 0, consentEvents: 0, dataRequests: 1 });
  });

  // The sharp end of the same property: the guard has to fire before anything
  // is deleted, not after.
  it('refuses a non-string key before opening a transaction, so nothing is deleted', async () => {
    await expect(eraseSubjectData({ not: '' } as never)).rejects.toThrow(TypeError);

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(tx.contactLead.deleteMany).not.toHaveBeenCalled();
  });

  it('lets a failed write reject rather than reporting an erasure that did not happen', async () => {
    tx.contactLead.deleteMany.mockRejectedValue(new Error('deadlock detected'));

    await expect(eraseSubjectData('person@example.com')).rejects.toThrow('deadlock detected');
  });
});
