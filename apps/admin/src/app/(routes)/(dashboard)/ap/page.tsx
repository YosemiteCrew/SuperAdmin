import type { Metadata } from 'next';
import { prisma } from '@superadmin/database';
import { requireSuperAdmin } from '@/app/config/backend';
import { InstancesTable } from './InstancesTable';

export const metadata: Metadata = {
  title: 'AP Federation',
};

export default async function APFederationPage() {
  await requireSuperAdmin();

  const tokens = await prisma.aPLicenseToken.findMany({
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
