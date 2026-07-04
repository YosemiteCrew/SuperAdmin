import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { listConsentSubjects, type CategoryState } from '@/app/features/consent/store';
import type { ConsentCategory } from '@/app/features/consent/types';

export const metadata: Metadata = { title: 'Consent' };

const STATE_STYLE: Record<CategoryState, string> = {
  granted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  withdrawn: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  unset: 'bg-ink-3/10 text-ink-3',
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Consent</h1>
        <p className="text-sm text-ink-3">
          The GDPR consent ledger. Every analytics and marketing decision from the web and mobile
          apps is recorded here; open a subject for the full, append-only audit trail.
        </p>
      </header>

      <form action="/consent" method="get" className="flex w-full max-w-xl items-center gap-2">
        <input
          type="search"
          name="search"
          defaultValue={trimmed}
          placeholder="Search by email or consent id"
          aria-label="Search consent subjects"
          className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-btn"
        />
        <button
          type="submit"
          className="h-11 min-w-[6rem] rounded-xl border border-btn bg-btn px-5 text-sm font-medium text-btn-ink"
        >
          Search
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        {subjects.length === 0 ? (
          <p className="p-5 text-sm text-ink-3">
            {trimmed ? `No consent records matched “${trimmed}”.` : 'No consent recorded yet.'}
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-2">
                <th className="px-5 py-3">Subject</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className="px-5 py-3">
                    {c.label}
                  </th>
                ))}
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3 text-right">Audit trail</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    <span className="font-medium text-ink">{s.email ?? truncate(s.consentId)}</span>
                    {s.email ? (
                      <span className="ml-2 font-mono text-xs text-ink-3">
                        {truncate(s.consentId, 12)}
                      </span>
                    ) : null}
                  </td>
                  {CATEGORIES.map((c) => (
                    <td key={c.key} className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_STYLE[s.state[c.key]]}`}
                      >
                        {STATE_LABEL[s.state[c.key]]}
                      </span>
                    </td>
                  ))}
                  <td className="px-5 py-3 text-ink-2">
                    <time dateTime={s.updatedAt.toISOString()}>
                      {formatDate(s.updatedAt.getTime())}
                    </time>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/consent/${s.id}`} className="text-sm text-ink hover:underline">
                      History →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <nav className="flex items-center justify-end text-sm" aria-label="Pagination">
        {nextCursor ? (
          <Link
            href={`/consent?${trimmed ? `search=${encodeURIComponent(trimmed)}&` : ''}cursor=${nextCursor}`}
            className="rounded-lg border border-btn bg-btn px-3 py-1.5 text-btn-ink hover:opacity-90"
          >
            Next →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
