import type { Metadata } from 'next';
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

function Stat({
  label,
  value,
  hint,
  sub,
}: Readonly<{ label: string; value: string; hint?: string; sub?: string }>) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-2 text-3xl font-medium tracking-tight text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-sm font-medium text-ink-2">{sub}</p> : null}
      {hint ? <p className="mt-1 text-xs text-ink-3">{hint}</p> : null}
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

  const emailUsers = users.filter((u) =>
    u.loginMethods.some((m) => m.recipeId === 'emailpassword')
  );
  const verifiedEmailUsers = emailUsers.filter((u) =>
    u.loginMethods.some((m) => m.recipeId === 'emailpassword' && m.verified)
  );
  const verificationPct =
    emailUsers.length > 0
      ? Math.round((verifiedEmailUsers.length / emailUsers.length) * 100)
      : null;

  const methodCounts = new Map<string, number>();
  for (const user of users) {
    const methods = new Set(user.loginMethods.map((m) => m.recipeId));
    for (const method of methods) {
      methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
    }
  }
  const methodRows = [...methodCounts.entries()].sort((a, b) => b[1] - a[1]);

  const trend = buildDailyTrend(timestamps);
  const peak = Math.max(1, ...trend.map((d) => d.count));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Analytics</h1>
        <p className="text-sm text-ink-3">User growth, sign-in methods, and security posture.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total users" value={String(totalUsers)} />
        <Stat label="New in last 7 days" value={String(last7)} hint={sampleHint} />
        <Stat label="New in last 30 days" value={String(last30)} hint={sampleHint} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat
          label="Email verification rate"
          value={verificationPct === null ? 'N/A' : `${verificationPct}%`}
          sub={
            emailUsers.length > 0
              ? `${verifiedEmailUsers.length} of ${emailUsers.length} email accounts`
              : undefined
          }
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

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">
            Signups - last {TREND_DAYS} days
          </h2>
          {sampleHint ? <span className="text-xs text-ink-3">{sampleHint}</span> : null}
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {trend.map((day) => (
            <li key={day.label} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs text-ink-3">{day.label}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-raised">
                <span
                  className="block h-full rounded-full bg-btn"
                  style={{ width: `${(day.count / peak) * 100}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-ink">
                {day.count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="border-b border-line bg-raised px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-2">
            Sign-in methods
          </h2>
        </div>
        {methodRows.length === 0 ? (
          <div className="p-5 text-sm text-ink-3">No users yet.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <tbody>
              {methodRows.map(([method, count]) => (
                <tr key={method} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3 font-medium text-ink">{method}</td>
                  <td className="px-5 py-3 text-right text-ink-2">{count}</td>
                  <td className="px-5 py-3 text-right text-xs text-ink-3">
                    {users.length > 0 ? `${Math.round((count / users.length) * 100)}%` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
