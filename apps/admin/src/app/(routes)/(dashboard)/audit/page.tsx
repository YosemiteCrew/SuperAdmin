import type { Metadata } from 'next';

import { AUDIT_LOG_LIMIT, AUDIT_META } from '@/app/features/audit/audit';
import { AuditTable } from '@/app/features/audit/AuditTable';
import { filterAuditEvents, parseAuditActionFilter } from '@/app/features/audit/filter';
import { getRecentAuditEvents } from '@/app/features/audit/store';

import { ExportAuditButton } from './ExportAuditButton';

export const metadata: Metadata = {
  title: 'Audit log',
};

type SearchParams = { action?: string; q?: string };

const ACTION_OPTIONS = Object.entries(AUDIT_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const INPUT_CLASS =
  'h-10 rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none transition-colors focus:border-btn';

export default async function AuditLogPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const { action, q } = await searchParams;
  const activeAction = parseAuditActionFilter(action);
  const searchTerm = (q ?? '').trim();

  const allEvents = await getRecentAuditEvents(AUDIT_LOG_LIMIT);
  const events = filterAuditEvents(allEvents, { action: activeAction, search: searchTerm });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Audit log</h1>
        <p className="text-sm text-ink-3">
          Every privileged action taken in this panel — who did what, to whom, and when.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          action="/audit"
          method="get"
          className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"
        >
          <select
            name="action"
            defaultValue={activeAction}
            aria-label="Filter by action"
            className={`${INPUT_CLASS} sm:w-56`}
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
            className={`${INPUT_CLASS} sm:w-64`}
          />
          <button
            type="submit"
            className="yc-primary-button inline-flex h-10 items-center justify-center rounded-xl border border-btn bg-btn px-5 text-sm font-medium text-btn-ink"
          >
            <span>Filter</span>
          </button>
        </form>
        <ExportAuditButton events={events} />
      </div>

      <AuditTable
        events={events}
        emptyMessage={
          allEvents.length === 0
            ? 'No super-admin actions have been recorded yet.'
            : 'No activity matches these filters.'
        }
      />
    </div>
  );
}
