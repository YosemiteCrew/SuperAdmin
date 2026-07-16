import type { Metadata } from 'next';
import supertokens from 'supertokens-node';
import TotpNode from 'supertokens-node/recipe/totp';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { serverEnv } from '@/app/config/env.server';

import { AdminsTable, type AdminRow } from './AdminsTable';

export const metadata: Metadata = {
  title: 'Admins',
};

async function loadAdminRow(
  userId: string,
  callerId: string,
  bootstrapEmails: string[],
  totalCount: number
): Promise<AdminRow | null> {
  const [userResult, metaResult, totpResult] = await Promise.allSettled([
    supertokens.getUser(userId),
    UserMetadataNode.getUserMetadata(userId),
    TotpNode.listDevices(userId),
  ]);

  const user = userResult.status === 'fulfilled' ? userResult.value : null;
  if (!user) return null;

  const meta = metaResult.status === 'fulfilled' ? metaResult.value.metadata : {};
  const devices = totpResult.status === 'fulfilled' ? totpResult.value.devices : [];

  const email = user.emails[0] ?? '';
  const firstName = typeof meta.firstName === 'string' ? meta.firstName : '';
  const lastName = typeof meta.lastName === 'string' ? meta.lastName : '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ');

  return {
    id: userId,
    email,
    displayName,
    lastSignInAt: typeof meta.lastSignInAt === 'number' ? meta.lastSignInAt : null,
    disabled: typeof meta.disabledAt === 'number',
    totpEnrolled: devices.some((d) => d.verified),
    isBootstrap: bootstrapEmails.includes(email.toLowerCase()),
    isSelf: userId === callerId,
    isLastAdmin: totalCount <= 1,
  };
}

export default async function AdminsPage() {
  ensureSuperTokensInit();
  const { userId: callerId } = await requireSuperAdmin();

  const roleHolders = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
  const adminIds = roleHolders.status === 'OK' ? roleHolders.users : [];
  const bootstrapEmails = (serverEnv.superadminBootstrapEmails ?? []).map((e: string) =>
    e.toLowerCase()
  );

  const rows = (
    await Promise.all(
      adminIds.map((id) => loadAdminRow(id, callerId, bootstrapEmails, adminIds.length))
    )
  ).filter((r): r is AdminRow => r !== null);

  rows.sort((a, b) => {
    if (a.isSelf && !b.isSelf) return -1;
    if (!a.isSelf && b.isSelf) return 1;
    if (a.isBootstrap && !b.isBootstrap) return -1;
    if (!a.isBootstrap && b.isBootstrap) return 1;
    return a.email.localeCompare(b.email);
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Admins</h1>
        <p className="text-sm text-ink-3">
          All accounts with super-admin access to this panel. Bootstrap accounts (
          <span className="font-medium">shield icon</span>) are protected from revocation.
        </p>
      </header>

      <div className="flex items-center gap-3 rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink-2">
        <span className="font-medium text-ink">{rows.length}</span>
        {rows.length === 1 ? 'super-admin' : 'super-admins'} — new admins must be provisioned via
        the SuperTokens dashboard or the bootstrap email list.
      </div>

      <AdminsTable rows={rows} />
    </div>
  );
}
