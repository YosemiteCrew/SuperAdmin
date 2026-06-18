import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { ensureSuperTokensInit } from '@/app/config/backend';

import { UserRowActions } from './UserRowActions';

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

  const userRows = await Promise.all(
    users.map(async (user) => {
      let lastSignInAt: number | null = null;
      try {
        const { metadata } = await UserMetadataNode.getUserMetadata(user.id);
        if (typeof metadata.lastSignInAt === 'number') {
          lastSignInAt = metadata.lastSignInAt;
        }
      } catch {
        /* metadata read should never block list rendering */
      }
      return {
        id: user.id,
        emails: user.emails,
        loginMethods: user.loginMethods,
        tenantIds: user.tenantIds,
        timeJoined: user.timeJoined,
        lastSignInAt,
      };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Users</h1>
        <p className="text-sm text-ink-3">
          Manage everyone with access to your Yosemite Crew account.
        </p>
      </header>

      <form action="/users" method="get" className="flex w-full max-w-xl items-center gap-2">
        <input
          type="search"
          name="search"
          defaultValue={trimmedSearch}
          placeholder="Search by email"
          className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none transition-colors focus:border-btn"
          aria-label="Search users by email"
        />
        <button
          type="submit"
          className="yc-primary-button inline-flex h-11 min-w-[6.5rem] items-center justify-center rounded-xl border border-btn bg-btn px-5 text-sm font-medium text-btn-ink"
        >
          <span>Search</span>
        </button>
        {trimmedSearch ? (
          <Link
            href="/users"
            className="inline-flex h-11 min-w-[5.5rem] items-center justify-center rounded-xl border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-raised"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        {users.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-3">
            {trimmedSearch ? `No users matched “${trimmedSearch}”.` : 'No users yet.'}
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-raised text-left text-xs font-medium uppercase tracking-wide text-ink-2">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Login method</th>
                <th className="px-4 py-3">Tenants</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((user) => {
                const primaryEmail = user.emails[0] ?? '—';
                const methods = Array.from(new Set(user.loginMethods.map((m) => m.recipeId))).join(
                  ', '
                );
                const tenants = user.tenantIds.join(', ') || DEFAULT_TENANT;
                const lastSeenMs = user.lastSignInAt ?? user.timeJoined;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-line last:border-b-0 hover:bg-raised/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${user.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {primaryEmail}
                      </Link>
                      {user.emails.length > 1 ? (
                        <span className="ml-1 text-xs text-ink-3">(+{user.emails.length - 1})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{methods}</td>
                    <td className="px-4 py-3 text-ink-2">{tenants}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-3" title={user.id}>
                      {truncate(user.id)}
                    </td>
                    <td
                      className="px-4 py-3 text-ink-2"
                      title={
                        user.lastSignInAt
                          ? 'Last sign-in'
                          : 'Has not signed in since lastSignInAt tracking was enabled — falling back to account creation time'
                      }
                    >
                      {formatDateTime(lastSeenMs)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserRowActions userId={user.id} email={primaryEmail} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <nav className="flex items-center justify-between text-sm text-ink-2" aria-label="Pagination">
        <span>
          Showing {users.length} {users.length === 1 ? 'user' : 'users'}
        </span>
        <div className="flex items-center gap-3">
          {cursor ? (
            <Link
              href={buildHref({ search: trimmedSearch || undefined })}
              className="rounded-lg border border-line px-3 py-1.5 text-ink hover:bg-raised"
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
              className="rounded-lg border border-btn bg-btn px-3 py-1.5 text-btn-ink hover:opacity-90"
            >
              Next →
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
