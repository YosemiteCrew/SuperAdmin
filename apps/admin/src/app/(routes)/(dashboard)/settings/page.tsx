import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import type { SessionInformation } from 'supertokens-node/recipe/session/types';
import TotpNode from 'supertokens-node/recipe/totp';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { requireSuperAdmin } from '@/app/config/backend';
import { serverEnv } from '@/app/config/env.server';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { AUDIT_LOG_LIMIT } from '@/app/features/audit/audit';
import { AuditTimeline } from '@/app/features/audit/AuditTimeline';
import { getAuditEventsForActor } from '@/app/features/audit/store';
import { buildSystemInfo, maskCoreHost } from '@/app/features/settings/systemInfo';
import { ThemeToggle } from '@/app/ui/components/ThemeToggle';

import { SessionsSection } from '../users/[id]/SessionsSection';
import { ChangeEmailForm } from './ChangeEmailForm';
import { ProfileForm } from './ProfileForm';
import { signOutEverywhereAction } from './actions';

export const metadata: Metadata = {
  title: 'Settings',
};

const CARD =
  'rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]';

async function loadNames(userId: string): Promise<{ firstName: string; lastName: string }> {
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    return {
      firstName: typeof metadata.firstName === 'string' ? metadata.firstName : '',
      lastName: typeof metadata.lastName === 'string' ? metadata.lastName : '',
    };
  } catch {
    return { firstName: '', lastName: '' };
  }
}

async function loadSessions(userId: string): Promise<SessionInformation[]> {
  try {
    const handles = await SessionNode.getAllSessionHandlesForUser(userId);
    return (
      await Promise.all(
        handles.map((handle) => SessionNode.getSessionInformation(handle).catch(() => undefined))
      )
    ).filter((session): session is SessionInformation => Boolean(session));
  } catch {
    return [];
  }
}

async function loadAdminCount(): Promise<number> {
  try {
    const result = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
    return result.status === 'OK' ? result.users.length : 0;
  } catch {
    return 0;
  }
}

async function loadTotpLabel(userId: string): Promise<string> {
  try {
    const { devices } = await TotpNode.listDevices(userId);
    const verified = devices.filter((device) => device.verified).length;
    if (verified === 0) return 'No verified device';
    return `${verified} verified ${verified === 1 ? 'device' : 'devices'}`;
  } catch {
    return 'Status unavailable';
  }
}

export default async function SettingsPage() {
  const { userId } = await requireSuperAdmin();
  const user = await supertokens.getUser(userId);
  const email = user?.emails[0] ?? '';

  const [{ firstName, lastName }, sessions, adminCount, totpLabel, myActivity] = await Promise.all([
    loadNames(userId),
    loadSessions(userId),
    loadAdminCount(),
    loadTotpLabel(userId),
    getAuditEventsForActor(userId),
  ]);

  const systemRows = buildSystemInfo({
    nodeEnv: process.env.NODE_ENV,
    buildSha: process.env.NEXT_PUBLIC_BUILD_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA,
    apiConfigured: Boolean(process.env.NEXT_PUBLIC_API_URL),
    coreHost: maskCoreHost(serverEnv.supertokensConnectionUri),
    auditRetention: AUDIT_LOG_LIMIT,
  });
  const bootstrapEmails = serverEnv.superadminBootstrapEmails;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-3">Manage your profile, security, and the panel.</p>
      </header>

      <section className={CARD} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-lg font-medium text-ink">
          Profile
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-3">
          Signed in as <span className="font-medium text-ink">{email}</span>
        </p>
        <ProfileForm firstName={firstName} lastName={lastName} />

        <div className="mt-6 border-t border-line pt-6">
          <h3 className="text-sm font-medium text-ink">Sign-in email</h3>
          <p className="mt-1 mb-4 text-sm text-ink-3">
            Change the email you sign in with. The new address must be verified.
          </p>
          <ChangeEmailForm currentEmail={email} />
        </div>
      </section>

      <section className={CARD} aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-lg font-medium text-ink">
          Appearance
        </h2>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Color theme</p>
            <p className="text-sm text-ink-3">Match the system setting, or force light or dark.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className={CARD} aria-labelledby="security-heading">
        <h2 id="security-heading" className="text-lg font-medium text-ink">
          Security
        </h2>
        <dl className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <dt className="text-sm font-medium text-ink">Password</dt>
              <dd className="text-sm text-ink-3">Change the password for this account.</dd>
            </div>
            <Link href="/auth/reset-password" className="yc-auth-link-brand text-sm">
              Reset password
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <dt className="text-sm font-medium text-ink">Two-factor authentication</dt>
              <dd className="text-sm text-ink-3">
                {totpLabel} · TOTP is required for all super admins.
              </dd>
            </div>
            <Link href="/auth/mfa/totp" className="yc-auth-link-brand text-sm">
              Manage device
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
            <div>
              <dt className="text-sm font-medium text-ink">Sign out everywhere</dt>
              <dd className="text-sm text-ink-3">End every session and return to sign-in.</dd>
            </div>
            <form action={signOutEverywhereAction}>
              <button
                type="submit"
                className="rounded-xl border border-danger-600 px-4 py-2 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white"
              >
                Sign out everywhere
              </button>
            </form>
          </div>
        </dl>
      </section>

      <SessionsSection sessions={sessions} userId={userId} showRevokeAll={false} />

      <section className={CARD} aria-labelledby="system-heading">
        <h2 id="system-heading" className="text-lg font-medium text-ink">
          System
        </h2>
        <dl className="mt-4 flex flex-col gap-3">
          {systemRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-ink-3">{row.label}</dt>
              <dd className="text-right text-sm font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={CARD} aria-labelledby="access-heading">
        <h2 id="access-heading" className="text-lg font-medium text-ink">
          Access
        </h2>
        <dl className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <dt className="text-sm font-medium text-ink">Super admins</dt>
              <dd className="text-sm text-ink-3">
                {adminCount} {adminCount === 1 ? 'account holds' : 'accounts hold'} the superadmin
                role.
              </dd>
            </div>
            <Link href="/users" className="yc-auth-link-brand text-sm">
              Manage
            </Link>
          </div>
          <div className="border-t border-line pt-4">
            <dt className="text-sm font-medium text-ink">Bootstrap allowlist</dt>
            <dd className="mt-1 break-words text-sm text-ink-3">
              {bootstrapEmails.length > 0
                ? bootstrapEmails.join(', ')
                : 'None configured (set SUPERADMIN_BOOTSTRAP_EMAILS).'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="flex items-center justify-between border-b border-line bg-raised px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-2">
            Your recent activity
          </h2>
          <Link href="/audit" className="text-xs font-medium text-ink hover:underline">
            View all →
          </Link>
        </div>
        <AuditTimeline
          events={myActivity}
          showTarget
          emptyMessage="You haven't taken any recorded actions yet."
        />
      </section>
    </div>
  );
}
