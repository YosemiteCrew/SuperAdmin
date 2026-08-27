import type { Metadata } from 'next';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { getInvites } from '@/app/features/invites/store';
import { inviteStatus, type InviteRecord, type InviteStatus } from '@/app/features/invites/types';

import { revokeInviteAction } from './actions';
import { InviteForm } from './InviteForm';

export const metadata: Metadata = {
  title: 'Invites',
};

const STATUS_STYLE: Record<InviteStatus, string> = {
  pending: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  used: 'bg-ink-3/10 text-ink-3',
  expired: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  revoked: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function InviteRow({ invite }: { readonly invite: InviteRecord }) {
  const status = inviteStatus(invite);
  return (
    <tr className="border-b border-line last:border-b-0">
      <td className="px-5 py-3 font-medium text-ink">{invite.email}</td>
      <td className="px-5 py-3 text-sm text-ink-2">{invite.createdByEmail}</td>
      <td className="px-5 py-3 text-sm text-ink-2">
        <time dateTime={new Date(invite.expiresAt).toISOString()}>
          {formatDate(invite.expiresAt)}
        </time>
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </td>
      <td className="px-5 py-3 text-right">
        {status === 'pending' ? (
          <form action={revokeInviteAction}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <button
              type="submit"
              className="rounded-lg border border-danger-600 px-3 py-1 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white"
            >
              Revoke
            </button>
          </form>
        ) : (
          <span className="text-xs text-ink-3">{invite.usedByEmail ?? invite.usedBy ?? '—'}</span>
        )}
      </td>
    </tr>
  );
}

export default async function InvitesPage() {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const invites = await getInvites();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Invites</h1>
        <p className="text-sm text-ink-3">
          Generate time-limited links to onboard new super-admins.
        </p>
      </header>

      <InviteForm />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="border-b border-line bg-raised px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-2">All invites</h2>
        </div>
        {invites.length === 0 ? (
          <p className="p-5 text-sm text-ink-3">No invites yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-2">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Created by</th>
                <th className="px-5 py-3">Expires</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Used by / Action</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <InviteRow key={invite.id} invite={invite} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
