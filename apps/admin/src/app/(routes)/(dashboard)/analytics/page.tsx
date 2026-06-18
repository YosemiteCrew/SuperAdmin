import type { Metadata } from 'next';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';

export const metadata: Metadata = {
  title: 'Analytics',
};

const SAMPLE_CAP = 500;
const TREND_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

type DayBucket = { label: string; count: number };

function Stat({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">{label}</p>
      <p className="mt-2 text-3xl font-medium tracking-tight text-neutral-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-600">{hint}</p> : null}
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

  const [totalUsers, newest] = await Promise.all([
    supertokens.getUserCount(),
    supertokens.getUsersNewestFirst({ tenantId: 'public', limit: SAMPLE_CAP }),
  ]);

  const users = newest.users;
  const sampled = users.length === SAMPLE_CAP;
  const timestamps = users.map((u) => u.timeJoined);

  const now = Date.now();
  const last7 = timestamps.filter((t) => t >= now - 7 * DAY_MS).length;
  const last30 = timestamps.filter((t) => t >= now - 30 * DAY_MS).length;

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
  const sampleHint = sampled ? `Based on the ${SAMPLE_CAP} newest users` : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">Analytics</h1>
        <p className="text-sm text-neutral-600">User growth and sign-in method breakdown.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total users" value={String(totalUsers)} />
        <Stat label="New in last 7 days" value={String(last7)} hint={sampleHint} />
        <Stat label="New in last 30 days" value={String(last30)} hint={sampleHint} />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-700">
            Signups · last {TREND_DAYS} days
          </h2>
          {sampleHint ? <span className="text-xs text-neutral-600">{sampleHint}</span> : null}
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {trend.map((day) => (
            <li key={day.label} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs text-neutral-600">{day.label}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <span
                  className="block h-full rounded-full bg-neutral-900"
                  style={{ width: `${(day.count / peak) * 100}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-neutral-900">
                {day.count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="border-b border-neutral-200 bg-neutral-100 px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-700">
            Sign-in methods
          </h2>
        </div>
        {methodRows.length === 0 ? (
          <div className="p-5 text-sm text-neutral-600">No users yet.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <tbody>
              {methodRows.map(([method, count]) => (
                <tr key={method} className="border-b border-neutral-200 last:border-b-0">
                  <td className="px-5 py-3 font-medium text-neutral-900">{method}</td>
                  <td className="px-5 py-3 text-right text-neutral-700">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
