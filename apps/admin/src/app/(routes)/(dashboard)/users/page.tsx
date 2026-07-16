import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { ensureSuperTokensInit } from '@/app/config/backend';

import { ExportUsersButton } from './ExportUsersButton';
import { UsersTable, type UserRow } from './UsersTable';

export const metadata: Metadata = {
  title: 'Users',
};

const PAGE_SIZE = 20;
const DEFAULT_TENANT = 'public';

type SearchParams = {
  search?: string;
  cursor?: string;
};

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncate(value: string, max = 14): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function buildHref(params: { search?: string; cursor?: string }): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.cursor) qs.set('cursor', params.cursor);
  const query = qs.toString();
  return query ? `/users?${query}` : '/users';
}

export default async function UsersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  ensureSuperTokensInit();

  const { search, cursor } = await searchParams;
  const trimmedSearch = search?.trim() ?? '';

  const { users, nextPaginationToken } = await supertokens.getUsersNewestFirst({
    tenantId: DEFAULT_TENANT,
    limit: PAGE_SIZE,
    paginationToken: cursor,
    query: trimmedSearch ? { email: trimmedSearch } : undefined,
  });

  const userRows: UserRow[] = await Promise.all(
    users.map(async (user) => {
      let lastSignInAt: number | null = null;
      let disabled = false;
      try {
        const { metadata } = await UserMetadataNode.getUserMetadata(user.id);
        if (typeof metadata.lastSignInAt === 'number') {
          lastSignInAt = metadata.lastSignInAt;
        }
        disabled = typeof metadata.disabledAt === 'number';
      } catch {
        /* metadata read should never block list rendering */
      }
      return {
        id: user.id,
        primaryEmail: user.emails[0] ?? '—',
        extraEmailCount: Math.max(user.emails.length - 1, 0),
        methods: Array.from(new Set(user.loginMethods.map((m) => m.recipeId))).join(', '),
        tenants: user.tenantIds.join(', ') || DEFAULT_TENANT,
        shortId: truncate(user.id),
        lastSeen: formatDateTime(lastSignInAt ?? user.timeJoined),
        lastSeenTitle: lastSignInAt
          ? 'Last sign-in'
          : 'Has not signed in since lastSignInAt tracking was enabled — falling back to account creation time',
        disabled,
      };
    })
  );

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-[3px]">
          <h1
            className="text-[26px] font-normal tracking-[-0.015em] text-[color:var(--ink)]"
            style={{ fontFamily: 'var(--font-serif-display)' }}
          >
            Users
          </h1>
          <p className="text-[13.5px] text-[color:var(--ink-muted)]">
            Manage everyone with access to your Yosemite Crew account.
          </p>
        </div>
        <ExportUsersButton />
      </header>

      <form action="/users" method="get" className="flex w-full max-w-xl items-center gap-[10px]">
        <input
          type="search"
          name="search"
          defaultValue={trimmedSearch}
          placeholder="Search by email"
          className="h-10 w-full rounded-xl border border-[color:var(--hairline)] bg-[var(--field-bg)] px-4 text-[13.5px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--blue)]"
          aria-label="Search users by email"
        />
        <button
          type="submit"
          className="yc-primary-button inline-flex h-10 min-w-[6.5rem] items-center justify-center rounded-full bg-[var(--btn)] px-5 text-[13.5px] font-semibold text-[color:var(--btn-ink)]"
        >
          <span>Search</span>
        </button>
        {trimmedSearch ? (
          <Link
            href="/users"
            className="inline-flex h-10 min-w-[5.5rem] items-center justify-center rounded-full border border-[color:var(--divider)] px-5 text-[13px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {users.length === 0 ? (
        <div className="rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] p-10 text-center text-[13.5px] text-[color:var(--ink-muted)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
          {trimmedSearch ? `No users matched “${trimmedSearch}”.` : 'No users yet.'}
        </div>
      ) : (
        <UsersTable rows={userRows} />
      )}

      <nav
        className="flex items-center justify-between text-[12.5px] text-[color:var(--ink-muted)]"
        aria-label="Pagination"
      >
        <span>
          Showing {users.length} {users.length === 1 ? 'user' : 'users'}
        </span>
        <div className="flex items-center gap-[10px]">
          {cursor ? (
            <Link
              href={buildHref({ search: trimmedSearch || undefined })}
              className="inline-flex h-8 items-center rounded-full border border-[color:var(--divider)] px-[14px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
            >
              ← First page
            </Link>
          ) : null}
          {nextPaginationToken ? (
            <Link
              href={buildHref({
                search: trimmedSearch || undefined,
                cursor: nextPaginationToken,
              })}
              className="inline-flex h-8 items-center rounded-full bg-[var(--btn)] px-[14px] font-semibold text-[color:var(--btn-ink)] transition-opacity hover:opacity-90"
            >
              Next →
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
