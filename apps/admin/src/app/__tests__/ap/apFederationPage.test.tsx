import { render, screen } from '@testing-library/react';

/**
 * The AP Federation page must not hand the stored license JWT to the browser.
 *
 * `APLicenseToken.token` is the complete signed RS256 credential, kept so it
 * can be re-served without re-signing. The page renders it through
 * `InstancesTable`, which is a client component, so every column the query
 * returns is serialised into the payload the browser receives - whether or not
 * the table displays it. An unselected `findMany` returns all of them.
 *
 * Nothing else catches this: the column is never rendered, so no visual or
 * accessibility test can see it, and `authenticate.ts` narrows its own select
 * correctly, so a reader checking the security-critical path finds nothing
 * wrong. The guard has to be on the query.
 */

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

const findManyMock = jest.fn();
jest.mock('@superadmin/database', () => ({
  prisma: { aPLicenseToken: { findMany: (...a: unknown[]) => findManyMock(...a) } },
}));

const instancesTableMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/ap/InstancesTable', () => ({
  InstancesTable: (props: { readonly tokens: unknown[] }) => {
    instancesTableMock(props);
    return <div data-testid="instances-table" />;
  },
}));

import APFederationPage from '@/app/(routes)/(dashboard)/ap/page';

/** Columns `InstancesTable` reads: renders, or derives status from. */
const RENDERED_COLUMNS = [
  'id',
  'orgId',
  'instanceDomain',
  'tier',
  'issuedAt',
  'expiresAt',
  'revokedAt',
] as const;

/** Columns that exist on the model and must never cross to the client. */
const WITHHELD_COLUMNS = ['token', 'keyId', 'revokedBy'] as const;

const ROW = {
  id: 'tok_1',
  orgId: 'org_1',
  instanceDomain: 'pims.example.com',
  tier: 'verified',
  issuedAt: new Date('2026-08-01T00:00:00.000Z'),
  expiresAt: new Date('2026-10-30T00:00:00.000Z'),
  revokedAt: null,
};

function selectArg(): Record<string, unknown> {
  const [args] = findManyMock.mock.calls[0] as [{ select?: Record<string, unknown> }];
  return args.select ?? {};
}

beforeEach(() => {
  findManyMock.mockResolvedValue([ROW]);
  requireSuperAdminMock.mockResolvedValue(undefined);
});

describe('AP Federation page license-token query', () => {
  // Identity checks first. Every assertion below reads
  // `findManyMock.mock.calls[0]`, and an empty call list would make each of
  // them pass by finding nothing to object to - which is the exact failure
  // mode this file exists to prevent.
  it('queries the license tokens and renders the table', async () => {
    render(await APFederationPage());

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(instancesTableMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('instances-table')).toBeInTheDocument();
  });

  it('passes a select rather than relying on the default column set', async () => {
    render(await APFederationPage());

    const [args] = findManyMock.mock.calls[0] as [Record<string, unknown>];
    expect(args).toHaveProperty('select');
    expect(Object.keys(selectArg()).length).toBeGreaterThan(0);
  });

  // Deliberately paired with the identity test above rather than standing
  // alone: with no `select` at all, `selectArg()` is `{}` and every
  // `not.toContain` here passes - the assertion is vacuous for the exact
  // defect it names. The `toHaveProperty('select')` check is what fails in
  // that case, so removing it does not shrink a diff, it removes this test's
  // only guarantee of having read anything.
  it('never selects the stored license JWT or the other withheld columns', async () => {
    render(await APFederationPage());

    const selected = Object.keys(selectArg());
    // Asserted per column rather than as a set difference: a failure names the
    // column that leaked instead of printing two lists to compare by eye.
    for (const column of WITHHELD_COLUMNS) {
      expect(selected).not.toContain(column);
    }
  });

  it('selects exactly the columns the table renders, no more', async () => {
    render(await APFederationPage());

    expect(Object.keys(selectArg()).sort()).toEqual([...RENDERED_COLUMNS].sort());
  });

  it('still orders newest first', async () => {
    render(await APFederationPage());

    const [args] = findManyMock.mock.calls[0] as [{ orderBy?: unknown }];
    expect(args.orderBy).toEqual({ issuedAt: 'desc' });
  });

  it('requires a super admin before reading any token row', async () => {
    render(await APFederationPage());

    expect(requireSuperAdminMock).toHaveBeenCalledTimes(1);
  });
});
