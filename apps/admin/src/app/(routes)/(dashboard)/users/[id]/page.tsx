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
import { AuditTimeline } from '@/app/features/audit/AuditTimeline';
import { getAuditEventsForTarget } from '@/app/features/audit/store';

import { DeleteUserButton } from '../DeleteUserButton';
import { DisableUserButton } from './DisableUserButton';
import { ExportAccountDataButton } from './ExportAccountDataButton';
import { ResetMfaButton } from './ResetMfaButton';
import { RoleButton } from './RoleButton';
import { SessionsSection } from './SessionsSection';
import { VerifyEmailButton } from './VerifyEmailButton';

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

function initialsFor(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || '—';
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

async function loadAccountMeta(
  userId: string
): Promise<{ lastSignInAt: number | null; disabledAt: number | null }> {
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    return {
      lastSignInAt: typeof metadata.lastSignInAt === 'number' ? metadata.lastSignInAt : null,
      disabledAt: typeof metadata.disabledAt === 'number' ? metadata.disabledAt : null,
    };
  } catch {
    /* metadata blip shouldn't crash the user detail page */
    return { lastSignInAt: null, disabledAt: null };
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

const SECTION_CLASS =
  'overflow-hidden rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const SECTION_HEAD =
  'border-b border-[color:var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[11px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const SECTION_BODY =
  'flex flex-col gap-[14px] p-[18px] sm:flex-row sm:items-center sm:justify-between';
const SECTION_STATE = 'text-[13.5px] font-semibold text-[color:var(--ink)]';
const SECTION_HINT = 'text-[12px] leading-[1.5] text-[color:var(--ink-faint)] text-pretty';
const DT_CLASS = 'text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint2)]';
const DD_CLASS = 'mt-[3px] text-[13.5px] font-medium text-[color:var(--ink)]';

function AccessSection({
  userId,
  email,
  isAdmin,
  hasSuperAdmin,
  isBootstrapAdmin,
  roleHint,
  canManageRole,
}: Readonly<{
  userId: string;
  email: string;
  isAdmin: boolean;
  hasSuperAdmin: boolean;
  isBootstrapAdmin: boolean;
  roleHint: string;
  canManageRole: boolean;
}>) {
  return (
    <section className={SECTION_CLASS}>
      <h2 className={SECTION_HEAD}>Access</h2>
      <div className={SECTION_BODY}>
        <div className="flex flex-col gap-[3px]">
          <div className="flex items-center gap-2">
            <span className={SECTION_STATE}>{hasSuperAdmin ? 'Super admin' : 'Standard user'}</span>
            {hasSuperAdmin ? (
              <span className="rounded-full bg-[var(--blue-soft)] px-[9px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--blue-text)]">
                {isBootstrapAdmin ? 'Bootstrap' : 'Role'}
              </span>
            ) : null}
          </div>
          <p className={SECTION_HINT}>{roleHint}</p>
        </div>
        {canManageRole ? <RoleButton userId={userId} email={email} isAdmin={isAdmin} /> : null}
      </div>
    </section>
  );
}

function EmailVerificationSection({
  userId,
  email,
  verified,
}: Readonly<{ userId: string; email: string; verified: boolean }>) {
  return (
    <section className={SECTION_CLASS}>
      <h2 className={SECTION_HEAD}>Email verification</h2>
      <div className={SECTION_BODY}>
        <div className="flex flex-col gap-[3px]">
          <p className={SECTION_STATE}>{verified ? 'Verified' : 'Not verified'}</p>
          <p className={SECTION_HINT}>
            Whether this account&apos;s email address has been confirmed. You can override it
            manually here.
          </p>
        </div>
        <VerifyEmailButton userId={userId} email={email} verified={verified} />
      </div>
    </section>
  );
}

function AccountStatusSection({
  userId,
  email,
  isDisabled,
  canManageStatus,
}: Readonly<{ userId: string; email: string; isDisabled: boolean; canManageStatus: boolean }>) {
  return (
    <section className={SECTION_CLASS}>
      <h2 className={SECTION_HEAD}>Account status</h2>
      <div className={SECTION_BODY}>
        <div className="flex flex-col gap-[3px]">
          <p className={SECTION_STATE}>{isDisabled ? 'Disabled' : 'Active'}</p>
          <p className={SECTION_HINT}>
            {isDisabled
              ? 'This account is signed out everywhere and blocked from signing in until re-enabled.'
              : 'Disabling blocks sign-in and revokes all sessions without deleting the account.'}
          </p>
        </div>
        {canManageStatus ? (
          <DisableUserButton userId={userId} email={email} disabled={isDisabled} />
        ) : null}
      </div>
    </section>
  );
}

export default async function UserDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  ensureSuperTokensInit();
  const { userId: callerId } = await requireSuperAdmin();

  const { id } = await params;
  const user = await supertokens.getUser(id);
  if (!user) notFound();

  const [sessions, accountMeta, totpDevices, isAdmin, auditEvents] = await Promise.all([
    loadSessions(id),
    loadAccountMeta(id),
    loadTotpDevices(id),
    loadIsSuperAdmin(id),
    getAuditEventsForTarget(id),
  ]);
  const { lastSignInAt, disabledAt } = accountMeta;

  const primaryEmail = user.emails[0] ?? '—';
  const methods = Array.from(new Set(user.loginMethods.map((m) => m.recipeId)));
  const verifiedDeviceCount = totpDevices.filter((device) => device.verified).length;
  const deviceWord = verifiedDeviceCount === 1 ? 'device' : 'devices';
  const totpStatusLabel =
    verifiedDeviceCount > 0
      ? `TOTP active (${verifiedDeviceCount} ${deviceWord})`
      : 'No verified TOTP device';
  const isBootstrapAdmin = serverEnv.superadminBootstrapEmails.includes(primaryEmail.toLowerCase());
  const isSelf = callerId === user.id;
  const hasSuperAdmin = isAdmin || isBootstrapAdmin;
  const roleHint = accessHint({ isBootstrapAdmin, isSelf, isAdmin });
  const canManageRole = !isBootstrapAdmin && !isSelf;
  const isDisabled = disabledAt !== null;
  const canManageStatus = !isSelf && !isBootstrapAdmin;
  const emailMethods = user.loginMethods.filter((method) => Boolean(method.email));
  const hasEmailMethod = emailMethods.length > 0;
  const emailVerified = hasEmailMethod && emailMethods.every((method) => method.verified);

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <Link
          href="/users"
          className="inline-flex items-center gap-[6px] text-[12.5px] font-semibold text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]"
        >
          ← Back to users
        </Link>
      </div>

      {/* sm:justify-between is dev's: it places ExportAccountDataButton (#105)
          opposite the identity block. This branch predates that button and had a
          plain centred row, which would push it under the heading. */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-[14px]">
          <span
            aria-hidden="true"
            className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full bg-[var(--avatar-violet-bg)] text-[15px] font-bold text-[color:var(--avatar-violet-ink)]"
          >
            {initialsFor(primaryEmail)}
          </span>
          <div className="flex min-w-0 flex-col gap-[2px]">
            <div className="flex items-baseline gap-3">
              <h1
                className="truncate text-[27px] font-normal tracking-[-0.015em] text-[color:var(--ink)]"
                style={{ fontFamily: 'var(--font-serif-display)' }}
              >
                {primaryEmail}
              </h1>
              {isDisabled ? (
                <span className="flex-none rounded-full border border-[color:var(--warn-border)] bg-[var(--warn-bg)] px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--warn-text)]">
                  Disabled
                </span>
              ) : null}
            </div>
            <p className="font-mono text-[11.5px] text-[color:var(--ink-faint)]">{user.id}</p>
          </div>
        </div>
        <ExportAccountDataButton userId={user.id} />
      </header>

      <section className={SECTION_CLASS}>
        <h2 className={SECTION_HEAD}>Identity</h2>
        <dl className="grid grid-cols-1 gap-x-5 gap-y-[14px] p-[18px] sm:grid-cols-2">
          <div>
            <dt className={DT_CLASS}>Emails</dt>
            <dd className={DD_CLASS}>{user.emails.length ? user.emails.join(', ') : '—'}</dd>
          </div>
          <div>
            <dt className={DT_CLASS}>Login methods</dt>
            <dd className={DD_CLASS}>{methods.length ? methods.join(', ') : '—'}</dd>
          </div>
          <div>
            <dt className={DT_CLASS}>Tenants</dt>
            <dd className={DD_CLASS}>{user.tenantIds.join(', ') || 'public'}</dd>
          </div>
          <div>
            <dt className={DT_CLASS}>First joined</dt>
            <dd className={DD_CLASS}>{formatDateTime(user.timeJoined)}</dd>
          </div>
          <div>
            <dt className={DT_CLASS}>Last seen</dt>
            <dd className={DD_CLASS}>
              {lastSignInAt ? (
                formatDateTime(lastSignInAt)
              ) : (
                <span className="font-normal text-[color:var(--ink-faint)]">
                  No sign-in recorded since tracking was enabled
                </span>
              )}
            </dd>
          </div>
          {user.phoneNumbers.length ? (
            <div>
              <dt className={DT_CLASS}>Phone numbers</dt>
              <dd className={DD_CLASS}>{user.phoneNumbers.join(', ')}</dd>
            </div>
          ) : null}
          <div>
            <dt className={DT_CLASS}>Primary user</dt>
            <dd className={DD_CLASS}>{user.isPrimaryUser ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </section>

      <AccessSection
        userId={user.id}
        email={primaryEmail}
        isAdmin={isAdmin}
        hasSuperAdmin={hasSuperAdmin}
        isBootstrapAdmin={isBootstrapAdmin}
        roleHint={roleHint}
        canManageRole={canManageRole}
      />

      <AccountStatusSection
        userId={user.id}
        email={primaryEmail}
        isDisabled={isDisabled}
        canManageStatus={canManageStatus}
      />

      {hasEmailMethod ? (
        <EmailVerificationSection userId={user.id} email={primaryEmail} verified={emailVerified} />
      ) : null}

      <SessionsSection sessions={sessions} userId={user.id} />

      <section className={SECTION_CLASS}>
        <h2 className={SECTION_HEAD}>Two-factor authentication</h2>
        <div className={SECTION_BODY}>
          <div className="flex flex-col gap-[3px]">
            <p className={SECTION_STATE}>{totpStatusLabel}</p>
            <p className={SECTION_HINT}>
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

      <section className={SECTION_CLASS}>
        <h2 className={SECTION_HEAD}>Activity</h2>
        <AuditTimeline
          events={auditEvents}
          emptyMessage="No super-admin actions recorded for this user yet."
        />
      </section>

      <section className="overflow-hidden rounded-[18px] border border-[color:var(--danger-border)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
        <div className="border-b border-[color:var(--danger-border)] bg-[var(--danger-bg-faint)] px-[18px] py-[11px]">
          <h2 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--danger-text)]">
            Danger zone
          </h2>
        </div>
        <div className={SECTION_BODY}>
          <div className="flex flex-col gap-[3px]">
            <p className={SECTION_STATE}>Delete this user</p>
            <p className={SECTION_HINT}>
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
