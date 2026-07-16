import type { Metadata } from 'next';
import Link from 'next/link';

import { AUDIT_LOG_LIMIT, AUDIT_META } from '@/app/features/audit/audit';
import { AuditIntegrityBanner } from '@/app/features/audit/AuditIntegrityBanner';
import { AuditTable } from '@/app/features/audit/AuditTable';
import {
  type AuditActionFilter,
  filterAuditEvents,
  paginate,
  parseAuditActionFilter,
  parseAuditDate,
  parsePage,
} from '@/app/features/audit/filter';
import { getRecentAuditEvents, verifyAuditChain } from '@/app/features/audit/store';

import { ExportAuditButton } from './ExportAuditButton';

export const metadata: Metadata = {
  title: 'Audit log',
};

type SearchParams = { action?: string; q?: string; from?: string; to?: string; page?: string };

const ACTION_OPTIONS = Object.entries(AUDIT_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const INPUT_CLASS =
  'h-10 rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none transition-colors focus:border-btn';

type HrefParams = {
  action: AuditActionFilter;
  search: string;
  from: string;
  to: string;
  page: number;
};

function buildAuditHref({ action, search, from, to, page }: HrefParams): string {
  const qs = new URLSearchParams();
  if (action !== 'all') qs.set('action', action);
  if (search) qs.set('q', search);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (page > 1) qs.set('page', String(page));
  const query = qs.toString();
  return query ? `/audit?${query}` : '/audit';
}

const PAGER_LINK =
  'rounded-lg border border-line px-3 py-1.5 text-ink transition-colors hover:bg-raised';

function Pagination({
  base,
  page,
  totalPages,
  total,
}: Readonly<{ base: Omit<HrefParams, 'page'>; page: number; totalPages: number; total: number }>) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between text-sm text-ink-2" aria-label="Pagination">
      <span>
        Page {page} of {totalPages} · {total} {total === 1 ? 'event' : 'events'}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={buildAuditHref({ ...base, page: page - 1 })} className={PAGER_LINK}>
            ← Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={buildAuditHref({ ...base, page: page + 1 })} className={PAGER_LINK}>
            Next →
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export default async function AuditLogPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const { action, q, from, to, page } = await searchParams;
  const activeAction = parseAuditActionFilter(action);
  const searchTerm = (q ?? '').trim();
  const fromRaw = (from ?? '').trim();
  const toRaw = (to ?? '').trim();

  // verifyAuditChain reads the raw stored log (with chain fields); the public
  // reader returns projected events. Run both reads concurrently.
  const [allEvents, integrity] = await Promise.all([
    getRecentAuditEvents(AUDIT_LOG_LIMIT),
    verifyAuditChain(),
  ]);
  const filtered = filterAuditEvents(allEvents, {
    action: activeAction,
    search: searchTerm,
    from: parseAuditDate(fromRaw, 'start'),
    to: parseAuditDate(toRaw, 'end'),
  });
  const paged = paginate(filtered, parsePage(page));
  const hrefBase = { action: activeAction, search: searchTerm, from: fromRaw, to: toRaw };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Audit log</h1>
        <p className="text-sm text-ink-3">
          Every privileged action taken in this panel — who did what, to whom, and when.
        </p>
      </header>

      <AuditIntegrityBanner status={integrity} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form action="/audit" method="get" className="flex flex-wrap items-end gap-2">
          <select
            name="action"
            defaultValue={activeAction}
            aria-label="Filter by action"
            className={`${INPUT_CLASS} sm:w-52`}
          >
            <option value="all">All actions</option>
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={searchTerm}
            placeholder="Search actor or target"
            aria-label="Search by actor or target"
            className={`${INPUT_CLASS} sm:w-56`}
          />
          <input
            type="date"
            name="from"
            defaultValue={fromRaw}
            aria-label="From date"
            className={INPUT_CLASS}
          />
          <input
            type="date"
            name="to"
            defaultValue={toRaw}
            aria-label="To date"
            className={INPUT_CLASS}
          />
          <button
            type="submit"
            className="yc-primary-button inline-flex h-10 items-center justify-center rounded-xl border border-btn bg-btn px-5 text-sm font-medium text-btn-ink"
          >
            <span>Filter</span>
          </button>
        </form>
        <ExportAuditButton events={filtered} />
      </div>

      <AuditTable
        events={paged.items}
        emptyMessage={
          allEvents.length === 0
            ? 'No super-admin actions have been recorded yet.'
            : 'No activity matches these filters.'
        }
      />

      <Pagination
        base={hrefBase}
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
      />
    </div>
  );
}
