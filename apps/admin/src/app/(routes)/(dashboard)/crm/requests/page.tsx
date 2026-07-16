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
  new: 'border-[color:var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]',
  in_progress:
    'border-[color:var(--blue-soft)] bg-[var(--blue-soft)] text-[color:var(--blue-text)]',
  closed: 'border-[color:var(--hairline)] bg-[var(--inset)] text-[color:var(--ink-faint)]',
};

const CARD =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';

/** Same rotation the users list uses, so a person keeps one colour identity
 *  across the panel. The design draws request avatars from this palette. */
const AVATAR_PALETTE = [
  'bg-[var(--avatar-violet-bg)] text-[color:var(--avatar-violet-ink)]',
  'bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  'bg-[var(--avatar-amber-bg)] text-[color:var(--avatar-amber-ink)]',
];

function initialsFor(name: string | null | undefined, email: string): string {
  const source = name?.trim() || (email.split('@')[0] ?? '');
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase() || '—';
}

function avatarClassFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash + char.codePointAt(0)!) % 255;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

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

/** A single submission. Extracted from the page body so the list stays a plain
 *  map and the page keeps its cognitive complexity within the Sonar limit. */
function RequestCard({
  request: r,
  account,
}: Readonly<{
  request: Awaited<ReturnType<typeof listContactRequests>>['requests'][number];
  account: { userId: string; signedUpAt: number } | undefined;
}>) {
  return (
    <article className={`${CARD} flex flex-col gap-2 px-5 pb-[14px] pt-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-[11px]">
          <span
            aria-hidden
            className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[11.5px] font-bold ${avatarClassFor(r.id)}`}
          >
            {initialsFor(r.name, r.email)}
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-[13.5px] font-bold text-[color:var(--ink)]">
              {r.name ?? r.email}
            </p>
            <p className="truncate text-[12px] text-[color:var(--ink-faint)]">
              {r.email}
              {r.company ? ` · ${r.company}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-none items-center gap-[10px]">
          <span
            className={`inline-flex rounded-full border px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] ${STATUS_STYLE[r.status]}`}
          >
            {FILTERS.find((f) => f.key === r.status)?.label ?? r.status}
          </span>
          <StatusControl requestId={r.id} status={r.status} />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {r.subject ? (
          <p className="text-[13px] font-bold text-[color:var(--ink)]">{r.subject}</p>
        ) : null}
        <p className="whitespace-pre-wrap text-[13px] leading-[1.55] text-[color:var(--ink-muted)]">
          {r.message}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-[6px] border-t border-[var(--hairline)] pt-[9px] text-[11.5px] text-[color:var(--ink-faint)]">
        <time dateTime={new Date(r.createdAt).toISOString()}>
          {formatDate(r.createdAt.getTime())}
        </time>
        {/* Green marks a real opt-in; a missing consent stays faint. */}
        {r.newsletterConsent ? (
          <span className="font-semibold text-[color:var(--success)]">
            Newsletter opt-in
            {r.consentAt ? ` (${formatDate(r.consentAt.getTime())})` : ''}
          </span>
        ) : (
          <span className="font-semibold">No newsletter consent</span>
        )}
        {account ? (
          <Link
            href={`/users/${account.userId}`}
            className="font-semibold text-[color:var(--blue-text)] hover:underline"
          >
            Signed up {formatDate(account.signedUpAt)} · View account
          </Link>
        ) : (
          <span className="font-semibold">Prospect (no account yet)</span>
        )}
      </div>
    </article>
  );
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

  const filterHref = (key: Filter) =>
    key === 'new' ? '/crm/requests' : `/crm/requests?status=${key}`;

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-[3px]">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Contact requests
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
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
              className={`inline-flex h-[34px] items-center gap-[7px] rounded-full border px-[15px] text-[12.5px] font-semibold transition-colors ${
                filter === f.key
                  ? 'border-[color:var(--btn)] bg-[var(--btn)] text-[color:var(--btn-ink)]'
                  : 'border-[color:var(--divider)] text-[color:var(--ink-muted)] hover:bg-[var(--surface-soft)]'
              }`}
            >
              {f.label}
              {count ? <span className="opacity-65 tabular-nums">{count}</span> : null}
            </Link>
          );
        })}
      </nav>

      {requests.length === 0 ? (
        <section className={`${CARD} p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]`}>
          <p>No contact requests here yet.</p>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} account={accounts.get(r.email.toLowerCase())} />
          ))}
        </div>
      )}

      <nav className="flex items-center justify-end" aria-label="Pagination">
        {nextCursor ? (
          <Link
            href={`/crm/requests?${filter === 'all' ? '' : `status=${filter}&`}cursor=${nextCursor}`}
            className="inline-flex h-8 items-center rounded-full bg-[var(--btn)] px-[14px] text-[12.5px] font-semibold text-[color:var(--btn-ink)] transition-opacity hover:opacity-90"
          >
            Next -&gt;
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
