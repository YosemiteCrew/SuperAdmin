import type { Metadata } from 'next';
import { prisma } from '@superadmin/database';
import { requireSuperAdmin } from '@/app/config/backend';
import { InstancesTable, type LicenseTokenRow } from './InstancesTable';

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

  // Select the rendered columns only. An unselected `findMany` returns `token`
  // - the complete signed license JWT, stored so it can be re-served - and
  // these rows are handed straight to a client component, so every column here
  // is serialised into the payload the browser receives. The table never shows
  // that field; without the select it shipped anyway, for every token ever
  // issued, on every load.
  //
  // The `LicenseTokenRow` annotation covers ONE of the two ways this regresses,
  // and it is worth knowing which. Widening is caught: add a column to the Pick
  // without adding it here and tsc fails TS2322 on this line. Deleting the
  // select is NOT caught - assignability is structural and excess-property
  // checking applies only to object literals, so the full `APLicenseToken[]` an
  // unselected query returns is assignable to `LicenseTokenRow[]` and compiles
  // clean. Both measured, not reasoned.
  //
  // What catches the deletion is `toHaveProperty('select')` in
  // __tests__/ap/apFederationPage.test.tsx. Do not read that assertion as
  // boilerplate - it is the only thing standing between this query and the
  // defect it was written for.
  const tokens: LicenseTokenRow[] = await prisma.aPLicenseToken.findMany({
    select: {
      id: true,
      orgId: true,
      instanceDomain: true,
      tier: true,
      issuedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
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
