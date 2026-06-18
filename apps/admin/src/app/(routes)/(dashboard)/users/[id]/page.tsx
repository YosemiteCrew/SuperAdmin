import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import supertokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import type { SessionInformation } from 'supertokens-node/recipe/session/types';
import TotpNode from 'supertokens-node/recipe/totp';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { serverEnv } from '@/app/config/env.server';

import { DeleteUserButton } from '../DeleteUserButton';
import { ResetMfaButton } from './ResetMfaButton';
import { RoleButton } from './RoleButton';
import { SessionsSection } from './SessionsSection';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  ensureSuperTokensInit();
  const { id } = await params;
  try {
    const user = await supertokens.getUser(id);
    return { title: user?.emails[0] ?? 'User detail' };
  } catch {
    return { title: 'User detail' };
  }
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function loadSessions(userId: string): Promise<SessionInformation[]> {
  try {
    const handles = await SessionNode.getAllSessionHandlesForUser(userId);
    return (
      await Promise.all(
        handles.map((handle) => SessionNode.getSessionInformation(handle).catch(() => undefined))
      )
    ).filter((s): s is SessionInformation => Boolean(s));
  } catch {
    /* sessions fetch is non-essential; identity + danger zone still render */
    return [];
  }
}

async function loadLastSignInAt(userId: string): Promise<number | null> {
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    return typeof metadata.lastSignInAt === 'number' ? metadata.lastSignInAt : null;
  } catch {
    /* metadata blip shouldn't crash the user detail page */
    return null;
  }
}

async function loadTotpDevices(userId: string): Promise<{ name: string; verified: boolean }[]> {
  try {
    const result = await TotpNode.listDevices(userId);
    return result.devices.map((device) => ({ name: device.name, verified: device.verified }));
  } catch {
    /* TOTP lookup is non-essential; the rest of the page still renders */
    return [];
  }
}

async function loadIsSuperAdmin(userId: string): Promise<boolean> {
  try {
    const { roles } = await UserRolesNode.getRolesForUser(DEFAULT_TENANT_ID, userId);
    return roles.includes(SUPERADMIN_ROLE);
  } catch {
    /* role lookup is non-essential; the rest of the page still renders */
    return false;
  }
}

function accessHint(flags: {
  isBootstrapAdmin: boolean;
  isSelf: boolean;
  isAdmin: boolean;
}): string {
  if (flags.isBootstrapAdmin) {
    return 'Granted via the environment bootstrap allowlist and cannot be changed from here.';
  }
  if (flags.isSelf) {
    return 'You cannot change your own access.';
  }
  if (flags.isAdmin) {
    return 'Can manage every user and organization in this panel.';
  }
  return 'Standard account with no super-admin access.';
}

export default async function UserDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  ensureSuperTokensInit();
  const { userId: callerId } = await requireSuperAdmin();

  const { id } = await params;
  const user = await supertokens.getUser(id);
  if (!user) notFound();

  const [sessions, lastSignInAt, totpDevices, isAdmin] = await Promise.all([
    loadSessions(id),
    loadLastSignInAt(id),
    loadTotpDevices(id),
    loadIsSuperAdmin(id),
  ]);

  const primaryEmail = user.emails[0] ?? '—';
  const methods = Array.from(new Set(user.loginMethods.map((m) => m.recipeId)));
  const verifiedDeviceCount = totpDevices.filter((device) => device.verified).length;
  const isBootstrapAdmin = serverEnv.superadminBootstrapEmails.includes(primaryEmail.toLowerCase());
  const isSelf = callerId === user.id;
  const hasSuperAdmin = isAdmin || isBootstrapAdmin;
  const roleHint = accessHint({ isBootstrapAdmin, isSelf, isAdmin });
  const canManageRole = !isBootstrapAdmin && !isSelf;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/users" className="text-sm text-neutral-700 hover:text-neutral-900">
          ← Back to users
        </Link>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">{primaryEmail}</h1>
        <p className="font-mono text-xs text-neutral-600">{user.id}</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <h2 className="border-b border-neutral-200 bg-neutral-100 px-5 py-3 text-xs font-medium uppercase tracking-wide text-neutral-700">
          Identity
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Emails</dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {user.emails.length ? user.emails.join(', ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Login methods</dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {methods.length ? methods.join(', ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Tenants</dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {user.tenantIds.join(', ') || 'public'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">First joined</dt>
            <dd className="mt-1 text-sm text-neutral-900">{formatDateTime(user.timeJoined)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Last seen</dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {lastSignInAt ? (
                formatDateTime(lastSignInAt)
              ) : (
                <span className="text-neutral-600">
                  No sign-in recorded since tracking was enabled
                </span>
              )}
            </dd>
          </div>
          {user.phoneNumbers.length ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-600">Phone numbers</dt>
              <dd className="mt-1 text-sm text-neutral-900">{user.phoneNumbers.join(', ')}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Primary user</dt>
            <dd className="mt-1 text-sm text-neutral-900">{user.isPrimaryUser ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <h2 className="border-b border-neutral-200 bg-neutral-100 px-5 py-3 text-xs font-medium uppercase tracking-wide text-neutral-700">
          Access
        </h2>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900">
                {hasSuperAdmin ? 'Super admin' : 'Standard user'}
              </span>
              {hasSuperAdmin ? (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-950">
                  {isBootstrapAdmin ? 'Bootstrap' : 'Role'}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-neutral-600">{roleHint}</p>
          </div>
          {canManageRole ? (
            <RoleButton userId={user.id} email={primaryEmail} isAdmin={isAdmin} />
          ) : null}
        </div>
      </section>

      <SessionsSection sessions={sessions} userId={user.id} />

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <h2 className="border-b border-neutral-200 bg-neutral-100 px-5 py-3 text-xs font-medium uppercase tracking-wide text-neutral-700">
          Two-factor authentication
        </h2>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-neutral-900">
              {verifiedDeviceCount > 0
                ? `TOTP active (${verifiedDeviceCount} device${verifiedDeviceCount === 1 ? '' : 's'})`
                : 'No verified TOTP device'}
            </p>
            <p className="text-xs text-neutral-600">
              Resetting removes this user&apos;s authenticator device and signs them out everywhere,
              so they must enroll a new device at next sign-in. Use this when an admin loses access
              to their authenticator.
            </p>
          </div>
          <ResetMfaButton
            userId={user.id}
            email={primaryEmail}
            hasDevice={verifiedDeviceCount > 0}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-danger-600/30 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="border-b border-danger-600/20 bg-red-50/60 px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-danger-600">
            Danger zone
          </h2>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-neutral-900">Delete this user</p>
            <p className="text-xs text-neutral-600">
              Removes the account from SuperTokens core, revokes all sessions, and deletes their
              metadata. Cannot be undone.
            </p>
          </div>
          <DeleteUserButton userId={user.id} email={primaryEmail} variant="danger-zone" />
        </div>
      </section>
    </div>
  );
}
