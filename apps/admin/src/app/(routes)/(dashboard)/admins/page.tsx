import type { Metadata } from 'next';
import Link from 'next/link';
import { IoPersonAddOutline } from 'react-icons/io5';
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
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Admins
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          All accounts with super-admin access to this panel. Bootstrap accounts carry a shield and
          are protected from revocation.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-2 rounded-[14px] border border-[var(--hairline)] bg-[var(--inset)] px-4 py-[11px] text-[13px] text-[color:var(--ink-muted)]">
        <span className="font-bold text-[color:var(--ink)]">
          {rows.length} super admin{rows.length === 1 ? '' : 's'}.
        </span>
        New admins join via an invite link or the bootstrap email list.
        <Link
          href="/invites"
          className="yc-primary-button ml-auto inline-flex h-[31px] items-center gap-1.5 rounded-full bg-[var(--btn)] px-[14px] text-[12px] font-semibold text-[color:var(--btn-ink)]"
        >
          <IoPersonAddOutline aria-hidden className="text-[13px]" />
          <span>Invite admin</span>
        </Link>
      </div>

      <AdminsTable rows={rows} />
    </div>
  );
}
