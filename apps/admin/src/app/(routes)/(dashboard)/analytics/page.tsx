import type { Metadata } from 'next';
import type { IconType } from 'react-icons';
import {
  IoKeyOutline,
  IoLogoGoogle,
  IoMailOutline,
  IoPhonePortraitOutline,
  IoSparklesOutline,
} from 'react-icons/io5';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { getMFAStats } from '@/app/features/analytics';
import type { DayBucket } from '@/app/features/analytics/types';

export const metadata: Metadata = {
  title: 'Analytics',
};

const SAMPLE_CAP = 500;
const TREND_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_RECIPE = 'emailpassword';

const CARD_CLASS =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const PANEL_LABEL_CLASS =
  'text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';

const METHOD_ICONS: Record<string, IconType> = {
  emailpassword: IoMailOutline,
  thirdparty: IoLogoGoogle,
  passwordless: IoPhonePortraitOutline,
};

/**
 * `sub` carries the ratio behind a rate (e.g. "12 of 30 email accounts"), added
 * with the verification/MFA stats. It sits between the value and the hint: ink-2
 * weight, so it reads as part of the number rather than as the fainter caveat
 * the hint is.
 */
function Stat({
  label,
  value,
  hint,
  sub,
}: Readonly<{ label: string; value: string; hint?: string; sub?: string }>) {
  return (
    <div className={`${CARD_CLASS} flex flex-col gap-[7px] px-[22px] py-[18px]`}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="text-[30px] font-bold leading-none tracking-[-0.02em] text-[color:var(--ink)] tabular-nums">
        {value}
      </p>
      {sub ? (
        <p className="text-[12.5px] font-semibold text-[color:var(--ink-muted)]">{sub}</p>
      ) : null}
      {hint ? <p className="text-[11.5px] text-[color:var(--ink-faint)]">{hint}</p> : null}
    </div>
  );
}

function buildDailyTrend(timestamps: readonly number[]): DayBucket[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const buckets: DayBucket[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const dayStart = startOfToday - i * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const count = timestamps.filter((t) => t >= dayStart && t < dayEnd).length;
    buckets.push({
      label: new Date(dayStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    });
  }
  return buckets;
}

/** The shape this page reads off a SuperTokens user; structural so the helpers
 *  below stay testable without constructing a full user object. */
type SampledUser = Readonly<{
  loginMethods: readonly Readonly<{ recipeId: string; verified: boolean }>[];
}>;

/**
 * Verified share of the accounts that actually have a password. Third-party and
 * passwordless users are excluded rather than counted as unverified: their
 * provider owns the address, so folding them in would report a rate for a
 * question they cannot answer.
 */
function emailVerification(users: readonly SampledUser[]): {
  verificationPct: number | null;
  verifiedEmailCount: number;
  emailCount: number;
} {
  const emailUsers = users.filter((u) => u.loginMethods.some((m) => m.recipeId === EMAIL_RECIPE));
  const verified = emailUsers.filter((u) =>
    u.loginMethods.some((m) => m.recipeId === EMAIL_RECIPE && m.verified)
  );
  return {
    verificationPct:
      emailUsers.length > 0 ? Math.round((verified.length / emailUsers.length) * 100) : null,
    verifiedEmailCount: verified.length,
    emailCount: emailUsers.length,
  };
}

/**
 * Users per sign-in method, busiest first. Counted through a Set so a user with
 * two login methods of the same recipe still counts once for it.
 */
function countSignInMethods(users: readonly SampledUser[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const user of users) {
    for (const method of new Set(user.loginMethods.map((m) => m.recipeId))) {
      counts.set(method, (counts.get(method) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function AnalyticsPage() {
  ensureSuperTokensInit();

  const [totalUsers, newest, mfaStats] = await Promise.all([
    supertokens.getUserCount(),
    supertokens.getUsersNewestFirst({ tenantId: 'public', limit: SAMPLE_CAP }),
    getMFAStats(),
  ]);

  const users = newest.users;
  const sampled = users.length === SAMPLE_CAP;
  const timestamps = users.map((u) => u.timeJoined);
  const sampleHint = sampled ? `Based on the ${SAMPLE_CAP} newest users` : undefined;

  const now = Date.now();
  const last7 = timestamps.filter((t) => t >= now - 7 * DAY_MS).length;
  const last30 = timestamps.filter((t) => t >= now - 30 * DAY_MS).length;

  const { verificationPct, verifiedEmailCount, emailCount } = emailVerification(users);
  const methodRows = countSignInMethods(users);

  const trend = buildDailyTrend(timestamps);
  const peak = Math.max(1, ...trend.map((d) => d.count));
  // sampleHint is already derived above; only peakDay is new here (the bar chart
  // labels the busiest day).
  const peakDay = trend.find((d) => d.count === peak);

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Analytics
        </h1>
        {/* dev's wording: the page gained the verification/MFA stats, so "security
            posture" is the accurate subtitle now. */}
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          User growth, sign-in methods, and security posture.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total users" value={String(totalUsers)} />
        <Stat label="New in last 7 days" value={String(last7)} hint={sampleHint} />
        <Stat label="New in last 30 days" value={String(last30)} hint={sampleHint} />
      </section>

      {/* Security posture (#96). These read as stats rather than a panel, so they
          reuse Stat and pick up the warm-bone card treatment for free. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat
          label="Email verification rate"
          value={verificationPct === null ? 'N/A' : `${verificationPct}%`}
          sub={emailCount > 0 ? `${verifiedEmailCount} of ${emailCount} email accounts` : undefined}
          hint={sampleHint}
        />
        <Stat
          label="MFA adoption rate"
          value={mfaStats.total > 0 ? `${mfaStats.adoptionPct}%` : 'N/A'}
          sub={
            mfaStats.total > 0
              ? `${mfaStats.mfaEnabled} of ${mfaStats.total} sampled users`
              : undefined
          }
          hint={
            mfaStats.total > 0
              ? `Sample of ${mfaStats.total} users, refreshed every 5 min`
              : undefined
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.35fr_1fr] sm:items-start">
        <section className={`${CARD_CLASS} px-[22px] py-5`}>
          <div className="flex items-center justify-between">
            <h2 className={PANEL_LABEL_CLASS}>Signups · last {TREND_DAYS} days</h2>
            {sampleHint ? (
              <span className="text-[11.5px] text-[color:var(--ink-faint)]">{sampleHint}</span>
            ) : null}
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {trend.map((day) => (
              <li key={day.label} className="flex items-center gap-3">
                <span className="w-[46px] shrink-0 text-[11px] text-[color:var(--ink-faint)] tabular-nums">
                  {day.label}
                </span>
                <span className="h-[9px] flex-1 overflow-hidden rounded-full bg-[var(--inset)]">
                  <span
                    className="block h-full rounded-full bg-[var(--blue)]"
                    style={{ width: `${(day.count / peak) * 100}%` }}
                  />
                </span>
                <span className="w-[26px] shrink-0 text-right text-[11.5px] font-semibold text-[color:var(--ink)] tabular-nums">
                  {day.count}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-4">
          <section className={`${CARD_CLASS} overflow-hidden`}>
            <div className="border-b border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-3">
              <h2 className={PANEL_LABEL_CLASS}>Sign-in methods</h2>
            </div>
            {methodRows.length === 0 ? (
              <div className="p-5 text-sm text-[color:var(--ink-faint)]">No users yet.</div>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <tbody>
                  {methodRows.map(([method, count]) => {
                    const Icon = METHOD_ICONS[method] ?? IoKeyOutline;
                    return (
                      <tr
                        key={method}
                        className="border-b border-[var(--hairline)] last:border-b-0"
                      >
                        <td className="px-[18px] py-3.5 font-semibold text-[color:var(--ink)]">
                          <span className="flex items-center gap-2.5">
                            <span
                              aria-hidden
                              className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] bg-[var(--nav-active-bg)] text-[15px] text-[color:var(--nav-active)]"
                            >
                              <Icon />
                            </span>
                            {method}
                          </span>
                        </td>
                        <td className="px-[18px] py-3.5 text-right font-bold text-[color:var(--ink)] tabular-nums">
                          {count}
                        </td>
                        {/* Share of the sample (dev). Kept in the warm-bone table:
                            the count alone does not say how common a method is. */}
                        <td className="w-[52px] px-[18px] py-3.5 text-right text-[11.5px] text-[color:var(--ink-faint)] tabular-nums">
                          {users.length > 0 ? `${Math.round((count / users.length) * 100)}%` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {peakDay && peakDay.count > 0 ? (
            <section className="flex flex-col gap-2 rounded-[18px] border border-[var(--hairline)] bg-[var(--screen-2)] px-5 py-[18px]">
              <h2 className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">
                <IoSparklesOutline aria-hidden className="text-[13px]" />
                Peak day
              </h2>
              <p className="font-[family-name:var(--font-serif-display)] text-[21px] font-normal leading-[1.3] tracking-[-0.01em] text-[color:var(--ink)]">
                {peakDay.label}:{' '}
                <em className="italic text-[color:var(--blue-text)]">
                  {peakDay.count} signup{peakDay.count === 1 ? '' : 's'}
                </em>
                , the busiest of the last {TREND_DAYS} days.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
