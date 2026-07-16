import type { Metadata } from 'next';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { getInvites } from '@/app/features/invites/store';
import { inviteStatus, type InviteRecord, type InviteStatus } from '@/app/features/invites/types';

import { revokeInviteAction } from './actions';
import { InviteForm } from './InviteForm';

export const metadata: Metadata = {
  title: 'Invites',
};

/**
 * Warm-bone status badges, mirroring the shipped VERIFICATION_META treatment.
 * `pending` is the live state for an invite (the link still works), so it takes
 * the positive palette; `expired` warns, `revoked` reads as danger, and `used`
 * is a spent, neutral terminal state.
 */
const STATUS_STYLE: Record<InviteStatus, string> = {
  pending:
    'border border-[var(--success)]/40 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  used: 'border border-[var(--hairline)] bg-[var(--inset)] text-[color:var(--ink-faint)]',
  expired: 'border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]',
  revoked:
    'border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
};

const TH =
  'px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const CARD_FOOT =
  'border-t border-[var(--hairline)] px-5 py-3 text-[12px] text-[color:var(--ink-faint)]';

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
    <tr className="border-b border-[var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--surface-soft)]">
      <td className="px-5 py-3 text-[13.5px] font-semibold text-[color:var(--ink)]">
        <span className="block truncate">{invite.email}</span>
      </td>
      <td className="px-5 py-3 text-[13.5px] text-[color:var(--ink-muted)]">
        <span className="block truncate">{invite.createdByEmail}</span>
      </td>
      <td className="px-5 py-3 text-[13.5px] text-[color:var(--ink-muted)]">
        <time dateTime={new Date(invite.expiresAt).toISOString()}>
          {formatDate(invite.expiresAt)}
        </time>
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex rounded-full px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] ${STATUS_STYLE[status]}`}
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
              className="inline-flex h-7 items-center justify-center rounded-full border border-[var(--danger-border)] px-[13px] text-[11.5px] font-semibold text-[color:var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)]"
            >
              Revoke
            </button>
          </form>
        ) : (
          <span className="block truncate text-[12px] text-[color:var(--ink-faint)]">
            {invite.usedByEmail ?? invite.usedBy ?? '·'}
          </span>
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
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Invites
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          Generate time-limited links to onboard new super-admins.
        </p>
      </header>

      <InviteForm />

      <section className="overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
        <div className="border-b border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[10px]">
          <h2 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
            All invites
          </h2>
        </div>
        {invites.length === 0 ? (
          <p className="p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]">
            No invites yet.
          </p>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[1.7fr]" />
              <col className="w-[1.5fr]" />
              <col className="w-[1.1fr]" />
              <col className="w-[1fr]" />
              <col className="w-[1.4fr]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--hairline)] bg-[var(--screen-2)] text-left">
                <th className={TH}>Email</th>
                <th className={TH}>Created by</th>
                <th className={TH}>Expires</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Used by / Action</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <InviteRow key={invite.id} invite={invite} />
              ))}
            </tbody>
          </table>
        )}
        <p className={CARD_FOOT}>
          The 50 most-recent invites are kept. Every generate, accept, and revoke lands in the audit
          log.
        </p>
      </section>
    </div>
  );
}
