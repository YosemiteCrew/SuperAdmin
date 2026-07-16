import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { AuditTimeline } from '@/app/features/audit/AuditTimeline';
import { getRecentAuditEvents } from '@/app/features/audit/store';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const RECENT_LIMIT = 5;
const ROLLING_WINDOW_DAYS = 7;
const ROLLING_FETCH_CAP = 100;

const AVATAR_TONES = [
  { bg: 'var(--avatar-green-bg)', ink: 'var(--avatar-green-ink)' },
  { bg: 'var(--avatar-violet-bg)', ink: 'var(--avatar-violet-ink)' },
  { bg: 'var(--avatar-amber-bg)', ink: 'var(--avatar-amber-ink)' },
] as const;

const CARD_CLASS =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const PANEL_HEAD_CLASS =
  'flex items-center justify-between border-b border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-3';
const PANEL_LABEL_CLASS =
  'text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const PANEL_LINK_CLASS =
  'text-[12.5px] font-semibold text-[color:var(--blue-text)] hover:underline';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function relativeFromNow(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(ms);
}

function initialsFor(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[^a-z0-9]+/i).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}

function toneFor(seed: string): (typeof AVATAR_TONES)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function Stat({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <div className={`${CARD_CLASS} flex flex-col gap-2 px-[22px] py-5`}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="text-[32px] font-bold leading-none tracking-[-0.02em] text-[color:var(--ink)] tabular-nums">
        {value}
      </p>
      {hint ? <p className="text-xs text-[color:var(--ink-faint)]">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  ensureSuperTokensInit();

  const [totalUsers, newest, auditEvents] = await Promise.all([
    supertokens.getUserCount(),
    supertokens.getUsersNewestFirst({
      tenantId: 'public',
      limit: ROLLING_FETCH_CAP,
    }),
    getRecentAuditEvents(8),
  ]);

  const recent = newest.users.slice(0, RECENT_LIMIT);
  const cutoff = Date.now() - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const newThisWeekSample = newest.users.filter((u) => u.timeJoined >= cutoff).length;
  const newThisWeekDisplay =
    newest.users.length === ROLLING_FETCH_CAP && newThisWeekSample === ROLLING_FETCH_CAP
      ? `${ROLLING_FETCH_CAP}+`
      : String(newThisWeekSample);

  const latestSignup = newest.users[0]?.timeJoined;

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[26px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Dashboard
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          Overview of activity in your Super Admin account.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total users" value={String(totalUsers)} />
        <Stat
          label={`New in last ${ROLLING_WINDOW_DAYS} days`}
          value={newThisWeekDisplay}
          hint={
            newest.users.length === ROLLING_FETCH_CAP
              ? `Sampled from the ${ROLLING_FETCH_CAP} newest users`
              : undefined
          }
        />
        <Stat
          label="Latest signup"
          value={latestSignup ? relativeFromNow(latestSignup) : '—'}
          hint={latestSignup ? formatDate(latestSignup) : undefined}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.35fr_1fr] sm:items-start">
        <section className={`${CARD_CLASS} overflow-hidden`}>
          <div className={PANEL_HEAD_CLASS}>
            <h2 className={PANEL_LABEL_CLASS}>Recent signups</h2>
            <Link href="/users" className={PANEL_LINK_CLASS}>
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-5 text-sm text-[color:var(--ink-faint)]">No signups yet.</div>
          ) : (
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-[var(--hairline)] bg-[var(--screen-2)] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
                  <th className="px-[18px] py-2.5 font-bold">Email</th>
                  <th className="px-[18px] py-2.5 font-bold">Login method</th>
                  <th className="px-[18px] py-2.5 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((user) => {
                  const primaryEmail = user.emails[0] ?? '—';
                  const methods = Array.from(
                    new Set(user.loginMethods.map((m) => m.recipeId))
                  ).join(', ');
                  const tone = toneFor(user.id);
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--hairline)] last:border-b-0 hover:bg-[var(--screen-2)]"
                    >
                      <td className="px-[18px] py-3">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden
                            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-bold"
                            style={{ background: tone.bg, color: tone.ink }}
                          >
                            {initialsFor(primaryEmail)}
                          </span>
                          <Link
                            href={`/users/${user.id}`}
                            className="truncate font-semibold text-[color:var(--ink)] hover:underline"
                          >
                            {primaryEmail}
                          </Link>
                        </span>
                      </td>
                      <td className="px-[18px] py-3 text-[color:var(--ink-muted)]">{methods}</td>
                      <td className="px-[18px] py-3 text-[color:var(--ink-muted)]">
                        <span title={formatDate(user.timeJoined)}>
                          {relativeFromNow(user.timeJoined)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className={`${CARD_CLASS} overflow-hidden`}>
          <div className={PANEL_HEAD_CLASS}>
            <h2 className={PANEL_LABEL_CLASS}>Recent admin activity</h2>
            <Link href="/audit" className={PANEL_LINK_CLASS}>
              Audit log →
            </Link>
          </div>
          <AuditTimeline
            events={auditEvents}
            showTarget
            emptyMessage="No super-admin actions recorded yet."
          />
        </section>
      </div>
    </div>
  );
}
