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

export const metadata: Metadata = {
  title: 'Analytics',
};

const SAMPLE_CAP = 500;
const TREND_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const CARD_CLASS =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const PANEL_LABEL_CLASS =
  'text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';

const METHOD_ICONS: Record<string, IconType> = {
  emailpassword: IoMailOutline,
  thirdparty: IoLogoGoogle,
  passwordless: IoPhonePortraitOutline,
};

type DayBucket = { label: string; count: number };

function Stat({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <div className={`${CARD_CLASS} flex flex-col gap-[7px] px-[22px] py-[18px]`}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="text-[30px] font-bold leading-none tracking-[-0.02em] text-[color:var(--ink)] tabular-nums">
        {value}
      </p>
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
  const peakDay = trend.find((d) => d.count === peak);
  const sampleHint = sampled ? `Based on the ${SAMPLE_CAP} newest users` : undefined;

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[26px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Analytics
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          User growth and sign-in method breakdown.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total users" value={String(totalUsers)} />
        <Stat label="New in last 7 days" value={String(last7)} hint={sampleHint} />
        <Stat label="New in last 30 days" value={String(last30)} hint={sampleHint} />
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
