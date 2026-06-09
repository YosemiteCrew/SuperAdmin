import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const RECENT_LIMIT = 5;
const ROLLING_WINDOW_DAYS = 7;
const ROLLING_FETCH_CAP = 100;

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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">{label}</p>
      <p className="mt-2 text-3xl font-medium tracking-tight text-neutral-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-600">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  ensureSuperTokensInit();

  const [totalUsers, newest] = await Promise.all([
    supertokens.getUserCount(),
    supertokens.getUsersNewestFirst({
      tenantId: 'public',
      limit: ROLLING_FETCH_CAP,
    }),
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-600">
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

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-700">
            Recent signups
          </h2>
          <Link href="/users" className="text-xs font-medium text-neutral-900 hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-5 text-sm text-neutral-600">No signups yet.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-700">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Login method</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((user) => {
                const primaryEmail = user.emails[0] ?? '—';
                const methods = Array.from(new Set(user.loginMethods.map((m) => m.recipeId))).join(
                  ', '
                );
                return (
                  <tr
                    key={user.id}
                    className="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-100/60"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/users/${user.id}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {primaryEmail}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-neutral-700">{methods}</td>
                    <td className="px-5 py-3 text-neutral-700">
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
    </div>
  );
}
