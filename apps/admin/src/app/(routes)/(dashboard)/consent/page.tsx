import type { Metadata } from 'next';
import Link from 'next/link';
import { IoArrowForward, IoSearchOutline } from 'react-icons/io5';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { listConsentSubjects, type CategoryState } from '@/app/features/consent/store';
import type { ConsentCategory } from '@/app/features/consent/types';

export const metadata: Metadata = { title: 'Consent' };

const CARD =
  'overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const TH =
  'px-[18px] py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const TD = 'px-[18px] py-3 text-[13.5px] text-[color:var(--ink-muted)]';
const BADGE =
  'inline-flex rounded-full border px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]';
const FOOTER_NOTE =
  'border-t border-[var(--hairline)] px-5 py-3 text-[12px] text-[color:var(--ink-faint)]';

/**
 * Warm-bone tokens per consent state, mirroring VERIFICATION_META: granted reads
 * as success, withdrawn as danger, unset as a neutral inset pill. All resolve
 * through theme-aware CSS variables, so the badges follow light and dark.
 */
const STATE_STYLE: Record<CategoryState, string> = {
  granted:
    'border-[var(--avatar-green-ink)]/30 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  withdrawn: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
  unset: 'border-[var(--hairline)] bg-[var(--inset)] text-[color:var(--ink-faint)]',
};

const STATE_LABEL: Record<CategoryState, string> = {
  granted: 'Granted',
  withdrawn: 'Withdrawn',
  unset: 'Not set',
};

const CATEGORIES: { key: ConsentCategory; label: string }[] = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'marketing', label: 'Marketing' },
];

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function truncate(value: string, max = 20): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default async function ConsentPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ search?: string; cursor?: string }> }>) {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const { search, cursor } = await searchParams;
  const trimmed = search?.trim() ?? '';
  const { subjects, nextCursor } = await listConsentSubjects({
    search: trimmed || undefined,
    cursor,
  });

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-[3px]">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Consent
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          The GDPR consent ledger. Every analytics and marketing decision from the web and mobile
          apps is recorded here; open a subject for the full, append-only audit trail.
        </p>
      </header>

      <form action="/consent" method="get" className="flex items-center gap-[10px]">
        <div className="relative w-[380px] max-w-full">
          <IoSearchOutline
            aria-hidden
            className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[15px] text-[color:var(--ink-faint)]"
          />
          <input
            type="search"
            name="search"
            defaultValue={trimmed}
            placeholder="Search by email or consent id"
            aria-label="Search consent subjects"
            className="h-10 w-full rounded-[12px] border border-[color:var(--hairline)] bg-[var(--field-bg)] pl-[38px] pr-4 text-[13.5px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--blue)]"
          />
        </div>
        <button
          type="submit"
          className="yc-primary-button inline-flex h-10 items-center justify-center rounded-full bg-[var(--btn)] px-5 text-[13.5px] font-semibold text-[color:var(--btn-ink)]"
        >
          <span>Search</span>
        </button>
      </form>

      <section className={CARD}>
        {subjects.length === 0 ? (
          <p className="p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]">
            {trimmed ? `No consent records matched “${trimmed}”.` : 'No consent recorded yet.'}
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] bg-[var(--screen-2)] text-left">
                <th className={TH}>Subject</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className={TH}>
                    {c.label}
                  </th>
                ))}
                <th className={TH}>Updated</th>
                <th className={`${TH} text-right`}>Audit trail</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[color:var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--surface-soft)]"
                >
                  <td className="px-[18px] py-3">
                    <span className="flex min-w-0 items-baseline gap-[9px]">
                      <span
                        className={`truncate text-[13.5px] font-semibold ${
                          s.email ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-faint)]'
                        }`}
                      >
                        {s.email ?? truncate(s.consentId)}
                      </span>
                      <span className="flex-none font-mono text-[10.5px] text-[color:var(--ink-faint)]">
                        {s.email ? truncate(s.consentId, 12) : 'anonymous'}
                      </span>
                    </span>
                  </td>
                  {CATEGORIES.map((c) => (
                    <td key={c.key} className="px-[18px] py-3">
                      <span className={`${BADGE} ${STATE_STYLE[s.state[c.key]]}`}>
                        {STATE_LABEL[s.state[c.key]]}
                      </span>
                    </td>
                  ))}
                  <td className={TD}>
                    <time dateTime={s.updatedAt.toISOString()}>
                      {formatDate(s.updatedAt.getTime())}
                    </time>
                  </td>
                  <td className="px-[18px] py-3 text-right">
                    <Link
                      href={`/consent/${s.id}`}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--blue-text)] hover:underline"
                    >
                      History
                      <IoArrowForward aria-hidden className="text-[11px]" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className={FOOTER_NOTE}>
          Events are never edited or deleted. An anonymous subject is linked to an account the first
          time it authenticates, and never re-pointed.
        </p>
      </section>

      <nav
        className="flex items-center justify-end text-[12.5px] text-[color:var(--ink-muted)]"
        aria-label="Pagination"
      >
        {nextCursor ? (
          <Link
            href={`/consent?${trimmed ? `search=${encodeURIComponent(trimmed)}&` : ''}cursor=${nextCursor}`}
            className="inline-flex h-8 items-center rounded-full bg-[var(--btn)] px-[14px] font-semibold text-[color:var(--btn-ink)] transition-opacity hover:opacity-90"
          >
            Next →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
