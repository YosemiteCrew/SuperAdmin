import type { Metadata } from 'next';

import { requireSuperAdmin } from '@/app/config/backend';
import { getDataRequestStats, listDataRequests } from '@/app/features/dataRequests/store';
import { RequestsTable } from './RequestsTable';

export const metadata: Metadata = {
  title: 'Data Requests',
};

const CARD_CLASS =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';

const VALUE_TONE = {
  neutral: 'text-[color:var(--ink)]',
  blue: 'text-[color:var(--blue-text)]',
  danger: 'text-[color:var(--danger-text)]',
} as const;

/**
 * Stat tile, mirroring the analytics Stat card. `tone` carries the compliance
 * signal the plain count cannot: the overdue tile turns danger once anything has
 * breached the statutory deadline, and stays neutral otherwise.
 */
function Stat({
  label,
  value,
  tone = 'neutral',
}: Readonly<{ label: string; value: string; tone?: keyof typeof VALUE_TONE }>) {
  const danger = tone === 'danger';
  const shell = danger
    ? 'rounded-[18px] border border-[var(--danger-border)] bg-[var(--danger-bg-faint)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]'
    : CARD_CLASS;
  return (
    <div className={`${shell} flex flex-col gap-[5px] px-5 py-[14px]`}>
      <p
        className={`text-[10.5px] font-bold uppercase tracking-[0.12em] ${
          danger ? 'text-[color:var(--danger-text)]' : 'text-[color:var(--ink-faint)]'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums ${VALUE_TONE[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function PrivacyRequestsPage() {
  await requireSuperAdmin();

  // Fix a single "now" so the deadline badges and the overdue count are
  // computed against the same instant (no SSR/client hydration drift).
  const now = new Date();
  const [requests, stats] = await Promise.all([listDataRequests(), getDataRequestStats(now)]);

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-[3px]">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Data requests
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          Track GDPR data-subject requests (access, erasure, rectification, objection) against the
          one-month statutory response deadline.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total" value={String(stats.total)} />
        <Stat label="Open" value={String(stats.open)} tone="blue" />
        <Stat
          label="Overdue"
          value={String(stats.overdue)}
          tone={stats.overdue > 0 ? 'danger' : 'neutral'}
        />
      </section>

      <RequestsTable requests={requests} nowMs={now.getTime()} />
    </div>
  );
}
