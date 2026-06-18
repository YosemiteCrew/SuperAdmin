import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import supertokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import type { SessionInformation } from 'supertokens-node/recipe/session/types';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { ensureSuperTokensInit } from '@/app/config/backend';

import { DeleteUserButton } from '../DeleteUserButton';
import { revokeAllSessionsAction, revokeSessionAction } from './actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  ensureSuperTokensInit();
  const { id } = await params;
  try {
    const user = await supertokens.getUser(id);
    return { title: user?.emails[0] ?? 'User detail' };
  } catch {
    return { title: 'User detail' };
  }
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeUntil(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} min`;
  }
  if (hours < 48) return `${hours} hr`;
  return `${Math.floor(hours / 24)} days`;
}

export default async function UserDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  ensureSuperTokensInit();

  const { id } = await params;
  const user = await supertokens.getUser(id);
  if (!user) notFound();

  let sessions: SessionInformation[] = [];
  try {
    const handles = await SessionNode.getAllSessionHandlesForUser(id);
    sessions = (
      await Promise.all(
        handles.map((handle) => SessionNode.getSessionInformation(handle).catch(() => undefined))
      )
    ).filter((s): s is SessionInformation => Boolean(s));
  } catch {
    /* sessions fetch is non-essential; identity + danger zone still render */
  }

  let lastSignInAt: number | null = null;
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(id);
    if (typeof metadata.lastSignInAt === 'number') {
      lastSignInAt = metadata.lastSignInAt;
    }
  } catch {
    /* metadata blip shouldn't crash the user detail page */
  }

  const primaryEmail = user.emails[0] ?? '—';
  const methods = Array.from(new Set(user.loginMethods.map((m) => m.recipeId)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/users" className="text-sm text-neutral-700 hover:text-neutral-900">
          ← Back to users
        </Link>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">{primaryEmail}</h1>
        <p className="font-mono text-xs text-neutral-600">{user.id}</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <h2 className="border-b border-neutral-200 bg-neutral-100 px-5 py-3 text-xs font-medium uppercase tracking-wide text-neutral-700">
          Identity
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Emails</dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {user.emails.length ? user.emails.join(', ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Login methods</dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {methods.length ? methods.join(', ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Tenants</dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {user.tenantIds.join(', ') || 'public'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">First joined</dt>
            <dd className="mt-1 text-sm text-neutral-900">{formatDateTime(user.timeJoined)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Last seen</dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {lastSignInAt ? (
                formatDateTime(lastSignInAt)
              ) : (
                <span className="text-neutral-600">
                  No sign-in recorded since tracking was enabled
                </span>
              )}
            </dd>
          </div>
          {user.phoneNumbers.length ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-600">Phone numbers</dt>
              <dd className="mt-1 text-sm text-neutral-900">{user.phoneNumbers.join(', ')}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-600">Primary user</dt>
            <dd className="mt-1 text-sm text-neutral-900">{user.isPrimaryUser ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-700">
            Active sessions ({sessions.length})
          </h2>
          {sessions.length > 0 ? (
            <form action={revokeAllSessionsAction}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="rounded-lg border border-danger-600 px-3 py-1 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white"
              >
                Revoke all
              </button>
            </form>
          ) : null}
        </div>
        {sessions.length === 0 ? (
          <div className="p-5 text-sm text-neutral-600">No active sessions.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-700">
                <th className="px-5 py-3">Session handle</th>
                <th className="px-5 py-3">Tenant</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Expires in</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.sessionHandle}
                  className="border-b border-neutral-200 last:border-b-0"
                >
                  <td
                    className="px-5 py-3 font-mono text-xs text-neutral-700"
                    title={session.sessionHandle}
                  >
                    {session.sessionHandle.slice(0, 16)}…
                  </td>
                  <td className="px-5 py-3 text-neutral-700">{session.tenantId}</td>
                  <td className="px-5 py-3 text-neutral-700">
                    {formatDateTime(session.timeCreated)}
                  </td>
                  <td className="px-5 py-3 text-neutral-700">{timeUntil(session.expiry)}</td>
                  <td className="px-5 py-3 text-right">
                    <form action={revokeSessionAction}>
                      <input type="hidden" name="sessionHandle" value={session.sessionHandle} />
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-100"
                      >
                        Revoke
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-danger-600/30 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="border-b border-danger-600/20 bg-red-50/60 px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-danger-600">
            Danger zone
          </h2>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-neutral-900">Delete this user</p>
            <p className="text-xs text-neutral-600">
              Removes the account from SuperTokens core, revokes all sessions, and deletes their
              metadata. Cannot be undone.
            </p>
          </div>
          <DeleteUserButton userId={user.id} email={primaryEmail} variant="danger-zone" />
        </div>
      </section>
    </div>
  );
}
