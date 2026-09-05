import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { ensureSuperTokensInit } from '@/app/config/backend';
import {
  DEFAULT_USER_TYPE_FILTER,
  USER_TYPE_FILTERS,
  USER_TYPE_META,
  type UserTypeFilter,
  parseUserTypeFilter,
  recipeIdsForUserType,
} from '@/app/features/users/filter';

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
  type?: string;
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

function buildHref(params: { search?: string; cursor?: string; type?: UserTypeFilter }): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.type && params.type !== DEFAULT_USER_TYPE_FILTER) qs.set('type', params.type);
  const query = qs.toString();
  return query ? `/users?${query}` : '/users';
}

/**
 * Switching the filter deliberately drops `cursor`: a pagination token is only
 * meaningful within the result set it came from, so carrying it across a filter
 * change would resume at an offset that no longer exists.
 */
function UserTypeTabs({ active, search }: Readonly<{ active: UserTypeFilter; search: string }>) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filter users by sign-in method">
      {USER_TYPE_FILTERS.map((key) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={buildHref({ search: search || undefined, type: key })}
            aria-current={isActive ? 'page' : undefined}
            title={USER_TYPE_META[key].hint}
            className={
              isActive
                ? 'inline-flex items-center gap-2 rounded-full border border-btn bg-btn px-3.5 py-1.5 text-sm font-medium text-btn-ink'
                : 'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-raised'
            }
          >
            {USER_TYPE_META[key].label}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function UsersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  ensureSuperTokensInit();

  const { search, cursor, type } = await searchParams;
  const trimmedSearch = search?.trim() ?? '';
  const typeFilter = parseUserTypeFilter(type);

  const { users, nextPaginationToken } = await supertokens.getUsersNewestFirst({
    tenantId: DEFAULT_TENANT,
    limit: PAGE_SIZE,
    paginationToken: cursor,
    includeRecipeIds: recipeIdsForUserType(typeFilter),
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

      <UserTypeTabs active={typeFilter} search={trimmedSearch} />

      <form action="/users" method="get" className="flex w-full max-w-xl items-center gap-[10px]">
        {typeFilter === DEFAULT_USER_TYPE_FILTER ? null : (
          <input type="hidden" name="type" value={typeFilter} />
        )}
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
            href={buildHref({ type: typeFilter })}
            className="inline-flex h-10 min-w-[5.5rem] items-center justify-center rounded-full border border-[color:var(--divider)] px-5 text-[13px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {users.length === 0 ? (
        <div className="rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] p-10 text-center text-[13.5px] text-[color:var(--ink-muted)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
          {trimmedSearch
            ? `No ${USER_TYPE_META[typeFilter].noun} matched “${trimmedSearch}”.`
            : `No ${USER_TYPE_META[typeFilter].noun} yet.`}
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
              href={buildHref({ search: trimmedSearch || undefined, type: typeFilter })}
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
                type: typeFilter,
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
