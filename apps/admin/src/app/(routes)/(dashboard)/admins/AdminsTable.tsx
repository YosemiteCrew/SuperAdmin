'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IoShieldCheckmarkOutline, IoShieldHalfOutline } from 'react-icons/io5';

import { revokeAdminAction } from './actions';

export type AdminRow = {
  id: string;
  email: string;
  displayName: string;
  lastSignInAt: number | null;
  disabled: boolean;
  totpEnrolled: boolean;
  isBootstrap: boolean;
  isSelf: boolean;
  isLastAdmin: boolean;
};

const TH =
  'px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const CARD =
  'overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const ACTION_BTN =
  'inline-flex h-7 items-center justify-center rounded-full border px-[13px] text-[11.5px] font-semibold transition-colors disabled:opacity-60';
const CARD_FOOT =
  'border-t border-[var(--hairline)] px-5 py-3 text-[12px] text-[color:var(--ink-faint)]';

// Same rotation the users list uses, so an account keeps a consistent feel
// across the two screens.
const AVATAR_PALETTE = [
  'bg-[var(--avatar-violet-bg)] text-[color:var(--avatar-violet-ink)]',
  'bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  'bg-[var(--avatar-amber-bg)] text-[color:var(--avatar-amber-ink)]',
];

function avatarClassFor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash + char.codePointAt(0)!) % 255;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
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

function Initials({ name, email }: { readonly name: string; readonly email: string }) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@]/);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden
      className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ${avatarClassFor(email)}`}
    >
      {letters || '?'}
    </span>
  );
}

const BADGE =
  'inline-flex rounded-full px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]';

/** Green reads as "a good status" here, matching the shipped VERIFICATION_META badges. */
function StatusCell({ disabled }: { readonly disabled: boolean }) {
  if (disabled) {
    return (
      <span
        className={`${BADGE} border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]`}
      >
        Disabled
      </span>
    );
  }
  return (
    <span
      className={`${BADGE} border border-[var(--success)]/40 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]`}
    >
      Active
    </span>
  );
}

function RevokeButton({ row }: { readonly row: AdminRow }) {
  const [pending, setPending] = useState(false);

  if (row.isSelf || row.isBootstrap || row.isLastAdmin) return null;

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    if (
      !globalThis.confirm(
        `Remove super-admin access from ${row.email}?\n\nThey will lose panel access on their next request.`
      )
    ) {
      e.preventDefault();
      return;
    }
    setPending(true);
  }

  return (
    <form action={revokeAdminAction} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={row.id} />
      <button
        type="submit"
        disabled={pending}
        className={`${ACTION_BTN} border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)] hover:bg-[var(--danger-bg)]`}
      >
        {pending ? 'Removing…' : 'Revoke'}
      </button>
    </form>
  );
}

export function AdminsTable({ rows }: { readonly rows: AdminRow[] }) {
  if (rows.length === 0) {
    return (
      <div className={`${CARD} p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]`}>
        No super-admins found.
      </div>
    );
  }

  return (
    <div className={CARD}>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[2.2fr]" />
          <col className="w-[0.9fr]" />
          <col className="w-[0.9fr]" />
          <col className="w-[1.3fr]" />
          <col className="w-[200px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--hairline)] bg-[var(--screen-2)] text-left">
            <th className={TH}>Account</th>
            <th className={TH}>Status</th>
            <th className={TH}>MFA</th>
            <th className={TH}>Last sign-in</th>
            <th className={`${TH} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-[var(--hairline)] transition-colors last:border-0 hover:bg-[var(--surface-soft)] ${
                row.disabled ? 'opacity-60' : ''
              }`}
            >
              <td className="px-5 py-[15px]">
                <div className="flex items-center gap-[10px]">
                  <Initials name={row.displayName} email={row.email} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-bold text-[color:var(--ink)]">
                        {row.email}
                      </span>
                      {row.isSelf ? (
                        <span className="shrink-0 rounded-full border border-[var(--hairline)] bg-[var(--pill-raised)] px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">
                          You
                        </span>
                      ) : null}
                      {row.isBootstrap ? (
                        <span
                          title="Bootstrap admin, protected from revocation"
                          className="shrink-0 text-[color:var(--warn-text)]"
                        >
                          <IoShieldHalfOutline size={14} />
                        </span>
                      ) : null}
                    </div>
                    {row.displayName ? (
                      <span className="truncate text-[11.5px] text-[color:var(--ink-faint)]">
                        {row.displayName}
                      </span>
                    ) : null}
                  </div>
                </div>
              </td>

              <td className="px-5 py-[15px]">
                <StatusCell disabled={row.disabled} />
              </td>

              <td className="px-5 py-[15px]">
                {row.totpEnrolled ? (
                  <span className="inline-flex items-center gap-1.5 text-[color:var(--success)]">
                    <IoShieldCheckmarkOutline size={13} />
                    <span className="text-[12px] font-bold">TOTP</span>
                  </span>
                ) : (
                  <span className="text-[12px] text-[color:var(--ink-faint)]">Not enrolled</span>
                )}
              </td>

              <td className="px-5 py-[15px] text-[13.5px] text-[color:var(--ink-muted)]">
                {row.lastSignInAt ? (
                  formatDateTime(row.lastSignInAt)
                ) : (
                  <span className="text-[color:var(--ink-faint)]">Never</span>
                )}
              </td>

              <td className="px-5 py-[15px]">
                <div className="flex items-center justify-end gap-2">
                  <RevokeButton row={row} />
                  <Link
                    href={`/users/${row.id}`}
                    className={`${ACTION_BTN} border-[var(--divider)] text-[color:var(--ink)] hover:bg-[var(--surface-soft)]`}
                  >
                    Manage
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={CARD_FOOT}>
        You cannot revoke yourself, a bootstrap admin, or the last remaining admin.
      </p>
    </div>
  );
}
