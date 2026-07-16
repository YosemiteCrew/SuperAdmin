import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { linkEmailsToAccounts } from '@/app/features/contact/link';
import {
  countRequestsByStatus,
  listContactRequests,
  type RequestStatus,
} from '@/app/features/contact/store';

import { StatusControl } from './StatusControl';

export const metadata: Metadata = { title: 'Contact requests' };

type Filter = RequestStatus | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
];

const STATUS_STYLE: Record<RequestStatus, string> = {
  new: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
  in_progress: 'bg-brand-100 text-brand-950 dark:bg-brand-900/30 dark:text-brand-300',
  closed: 'bg-ink-3/10 text-ink-3',
};

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

export default async function ContactRequestsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ status?: string; cursor?: string }> }>) {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const { status, cursor } = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === status) ? (status as Filter) : 'new';

  const [{ requests, nextCursor }, counts] = await Promise.all([
    listContactRequests({ status: filter === 'all' ? undefined : filter, cursor }),
    countRequestsByStatus(),
  ]);

  const accounts = await linkEmailsToAccounts(requests.map((r) => r.email));

  const filterHref = (key: Filter) => (key === 'new' ? '/crm/requests' : `/crm/requests?status=${key}`);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Contact requests</h1>
        <p className="text-sm text-ink-3">
          Every submission from the yosemitecrew.com contact form. Each person becomes a contact
          card; requests from the same email are grouped.
        </p>
      </header>

      <nav className="flex items-center gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? undefined : counts[f.key];
          return (
            <Link
              key={f.key}
              href={filterHref(f.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                filter === f.key
                  ? 'border-btn bg-btn text-btn-ink'
                  : 'border-line bg-surface text-ink hover:bg-raised'
              }`}
            >
              {f.label}
              {count ? ` (${count})` : ''}
            </Link>
          );
        })}
      </nav>

      {requests.length === 0 ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
          <p className="text-sm text-ink-3">No contact requests here yet.</p>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((r) => {
            const account = accounts.get(r.email.toLowerCase());
            return (
              <article
                key={r.id}
                className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium text-ink">{r.name ?? r.email}</p>
                    <p className="text-sm text-ink-2">{r.email}</p>
                    {r.company ? <p className="text-xs text-ink-3">{r.company}</p> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}
                    >
                      {FILTERS.find((f) => f.key === r.status)?.label ?? r.status}
                    </span>
                    <StatusControl requestId={r.id} status={r.status} />
                  </div>
                </div>

                {r.subject ? (
                  <p className="mt-3 text-sm font-medium text-ink">{r.subject}</p>
                ) : null}
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{r.message}</p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
                  <time dateTime={new Date(r.createdAt).toISOString()}>
                    {formatDate(r.createdAt.getTime())}
                  </time>
                  {r.newsletterConsent ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Newsletter opt-in
                      {r.consentAt ? ` (${formatDate(r.consentAt.getTime())})` : ''}
                    </span>
                  ) : (
                    <span>No newsletter consent</span>
                  )}
                  {account ? (
                    <Link href={`/users/${account.userId}`} className="text-ink-2 hover:underline">
                      Signed up {formatDate(account.signedUpAt)} - view account
                    </Link>
                  ) : (
                    <span>Prospect (no account yet)</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <nav className="flex items-center justify-end text-sm" aria-label="Pagination">
        {nextCursor ? (
          <Link
            href={`/crm/requests?${filter === 'all' ? '' : `status=${filter}&`}cursor=${nextCursor}`}
            className="rounded-lg border border-btn bg-btn px-3 py-1.5 text-btn-ink hover:opacity-90"
          >
            Next -&gt;
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
