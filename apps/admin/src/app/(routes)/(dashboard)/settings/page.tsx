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
  'rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] p-5 shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';

/** Uppercase strip that heads the read-only cards (System, recent activity). */
const CARD_STRIP =
  'border-b border-[color:var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[11px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';

const CARD_TITLE = 'text-[15.5px] font-bold text-[color:var(--ink)]';

const ROW_LABEL = 'text-[13.5px] font-semibold text-[color:var(--ink)]';

const ROW_SUB = 'text-[12px] text-[color:var(--ink-faint)]';

const LINK_ACTION = 'text-[12.5px] font-semibold text-[color:var(--blue-text)] hover:underline';

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
    <div className="flex w-full flex-col gap-[22px]">
      <header className="flex flex-col gap-[3px]">
        <h1 className="m-0 font-[family-name:var(--font-serif-display)] text-[26px] font-normal tracking-[-0.015em] text-[color:var(--ink)]">
          Settings
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          Manage your profile, security, and the panel.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-4">
          <section className={CARD} aria-labelledby="profile-heading">
            <h2 id="profile-heading" className={CARD_TITLE}>
              Profile
            </h2>
            <p className="mt-0.5 mb-4 text-[12.5px] text-[color:var(--ink-faint)]">
              Signed in as{' '}
              <span className="font-semibold text-[color:var(--ink-muted)]">{email}</span>
            </p>
            <ProfileForm firstName={firstName} lastName={lastName} />

            <div className="mt-[14px] border-t border-[color:var(--hairline)] pt-[14px]">
              <h3 className={ROW_LABEL}>Sign-in email</h3>
              <p className="mt-0.5 mb-4 text-[11.5px] text-[color:var(--ink-faint)]">
                Change the email you sign in with. The new address must be verified.
              </p>
              <ChangeEmailForm currentEmail={email} />
            </div>
          </section>

          <section className={CARD} aria-labelledby="appearance-heading">
            <div className="flex items-center justify-between gap-[14px]">
              <div className="flex flex-col gap-0.5">
                <h2 id="appearance-heading" className={CARD_TITLE}>
                  Appearance
                </h2>
                <p className="text-[12.5px] text-[color:var(--ink-faint)]">
                  Match the system setting, or force light or dark.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </section>

          <section className={CARD} aria-labelledby="security-heading">
            <h2 id="security-heading" className={CARD_TITLE}>
              Security
            </h2>
            <dl className="mt-[13px] flex flex-col gap-[13px]">
              <div className="flex items-center justify-between gap-[14px]">
                <div className="flex flex-col gap-px">
                  <dt className={ROW_LABEL}>Password</dt>
                  <dd className={ROW_SUB}>Change the password for this account.</dd>
                </div>
                <Link href="/auth/reset-password" className={`yc-auth-link-brand ${LINK_ACTION}`}>
                  Reset password
                </Link>
              </div>

              <div className="flex items-center justify-between gap-[14px]">
                <div className="flex flex-col gap-px">
                  <dt className={ROW_LABEL}>Two-factor authentication</dt>
                  <dd className={ROW_SUB}>{totpLabel} · TOTP is required for all super admins.</dd>
                </div>
                <Link href="/auth/mfa/totp" className={`yc-auth-link-brand ${LINK_ACTION}`}>
                  Manage device
                </Link>
              </div>

              <div className="flex items-center justify-between gap-[14px] border-t border-[color:var(--hairline)] pt-[13px]">
                <div className="flex flex-col gap-px">
                  <dt className={ROW_LABEL}>Sign out everywhere</dt>
                  <dd className={ROW_SUB}>End every session and return to sign-in.</dd>
                </div>
                <form action={signOutEverywhereAction}>
                  <button
                    type="submit"
                    className="h-[34px] rounded-full border border-[color:var(--danger-border)] px-[15px] text-[12.5px] font-semibold text-[color:var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)]"
                  >
                    Sign out everywhere
                  </button>
                </form>
              </div>
            </dl>
          </section>

          <SessionsSection sessions={sessions} userId={userId} showRevokeAll={false} />
        </div>

        <div className="flex flex-col gap-4">
          <section
            className="overflow-hidden rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]"
            aria-labelledby="system-heading"
          >
            <h2 id="system-heading" className={CARD_STRIP}>
              System
            </h2>
            <dl className="flex flex-col py-1.5">
              {systemRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-[14px] px-[18px] py-[9px]"
                >
                  <dt className="text-[12.5px] text-[color:var(--ink-faint)]">{row.label}</dt>
                  <dd className="text-right text-[12.5px] font-semibold text-[color:var(--ink)]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={CARD} aria-labelledby="access-heading">
            <h2 id="access-heading" className={CARD_TITLE}>
              Access
            </h2>
            <dl className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-[14px]">
                <div className="flex flex-col gap-px">
                  <dt className="text-[13px] font-semibold text-[color:var(--ink)]">
                    Super admins
                  </dt>
                  <dd className={ROW_SUB}>
                    {adminCount} {adminCount === 1 ? 'account holds' : 'accounts hold'} the
                    superadmin role.
                  </dd>
                </div>
                <Link href="/users" className={`yc-auth-link-brand ${LINK_ACTION}`}>
                  Manage
                </Link>
              </div>
              <div className="border-t border-[color:var(--hairline)] pt-3">
                <dt className="text-[13px] font-semibold text-[color:var(--ink)]">
                  Bootstrap allowlist
                </dt>
                <dd className={`mt-0.5 break-words ${ROW_SUB}`}>
                  {bootstrapEmails.length > 0
                    ? bootstrapEmails.join(', ')
                    : 'None configured (set SUPERADMIN_BOOTSTRAP_EMAILS).'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
            <div className="flex items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[11px]">
              <h2 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
                Your recent activity
              </h2>
              <Link
                href="/audit"
                className="text-[12px] font-semibold text-[color:var(--blue-text)] hover:underline"
              >
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
      </div>
    </div>
  );
}
