import type { Metadata } from 'next';
import { prisma } from '@superadmin/database';
import { requireSuperAdmin } from '@/app/config/backend';
import { InstancesTable, type LicenseTokenRow } from './InstancesTable';

export const metadata: Metadata = {
  title: 'AP Federation',
};

export default async function APFederationPage() {
  await requireSuperAdmin();

  // Select the rendered columns only. An unselected `findMany` returns `token`
  // - the complete signed license JWT, stored so it can be re-served - and
  // these rows are handed straight to a client component, so every column here
  // is serialised into the payload the browser receives. The table never shows
  // that field; without the select it shipped anyway, for every token ever
  // issued, on every load.
  //
  // The `LicenseTokenRow` annotation covers ONE of the two ways this regresses,
  // and it is worth knowing which. Widening is caught: add a column to the Pick
  // without adding it here and tsc fails TS2322 on this line. Deleting the
  // select is NOT caught - assignability is structural and excess-property
  // checking applies only to object literals, so the full `APLicenseToken[]` an
  // unselected query returns is assignable to `LicenseTokenRow[]` and compiles
  // clean. Both measured, not reasoned.
  //
  // What catches the deletion is `toHaveProperty('select')` in
  // __tests__/ap/apFederationPage.test.tsx. Do not read that assertion as
  // boilerplate - it is the only thing standing between this query and the
  // defect it was written for.
  const tokens: LicenseTokenRow[] = await prisma.aPLicenseToken.findMany({
    select: {
      id: true,
      orgId: true,
      instanceDomain: true,
      tier: true,
      issuedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
    orderBy: { issuedAt: 'desc' },
  });

  const activeCount = tokens.filter((t) => !t.revokedAt && t.expiresAt > new Date()).length;
  const revokedCount = tokens.filter((t) => t.revokedAt !== null).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">AP Federation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage ActivityPub license tokens for verified self-hosted PIMS instances.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total issued</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{tokens.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Revoked</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{revokedCount}</p>
        </div>
      </div>

      <InstancesTable tokens={tokens} />
    </div>
  );
}
