import type { Metadata } from 'next';
import { prisma } from '@superadmin/database';
import { requireSuperAdmin } from '@/app/config/backend';
import { InstancesTable } from './InstancesTable';

export const metadata: Metadata = {
  title: 'AP Federation',
};

const PILL =
  'inline-flex h-[34px] flex-none items-center gap-[7px] rounded-full border px-[14px] text-[12px] font-semibold';

const PILL_TONES = {
  neutral: 'border-[var(--hairline)] bg-[var(--pill-raised)] text-[color:var(--ink-faint)]',
  good: 'border-[var(--success)]/40 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  danger: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
} as const;

/**
 * The counters are pills in the header row rather than stat cards: they annotate
 * the table below instead of standing as their own metrics panel. Active is a
 * good status, so it reads green; revoked reads danger.
 */
function CountPill({
  label,
  count,
  tone,
}: Readonly<{ label: string; count: number; tone: keyof typeof PILL_TONES }>) {
  return (
    <span className={`${PILL} ${PILL_TONES[tone]}`}>
      {label}
      <span
        className={`font-bold tabular-nums ${tone === 'neutral' ? 'text-[color:var(--ink)]' : ''}`}
      >
        {count}
      </span>
    </span>
  );
}

export default async function APFederationPage() {
  await requireSuperAdmin();

  const tokens = await prisma.aPLicenseToken.findMany({
    orderBy: { issuedAt: 'desc' },
  });

  const activeCount = tokens.filter((t) => !t.revokedAt && t.expiresAt > new Date()).length;
  const revokedCount = tokens.filter((t) => t.revokedAt !== null).length;

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
            AP Federation
          </h1>
          <p className="text-[13.5px] text-[color:var(--ink-muted)]">
            Manage ActivityPub license tokens for verified self-hosted PIMS instances
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CountPill label="Total issued" count={tokens.length} tone="neutral" />
          <CountPill label="Active" count={activeCount} tone="good" />
          <CountPill label="Revoked" count={revokedCount} tone="danger" />
        </div>
      </header>

      <InstancesTable tokens={tokens} />
    </div>
  );
}
