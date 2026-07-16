'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MdOutlineShield, MdOutlineVerifiedUser } from 'react-icons/md';

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
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-btn text-xs font-semibold text-btn-ink"
    >
      {letters || '?'}
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
        className="inline-flex items-center justify-center rounded-lg border border-danger-600 px-3 py-1.5 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-50"
      >
        {pending ? 'Removing…' : 'Revoke'}
      </button>
    </form>
  );
}

export function AdminsTable({ rows }: { readonly rows: AdminRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-ink-3 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        No super-admins found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="px-5 py-3.5 text-left font-medium text-ink-2">Account</th>
            <th className="px-5 py-3.5 text-left font-medium text-ink-2">Status</th>
            <th className="px-5 py-3.5 text-left font-medium text-ink-2">MFA</th>
            <th className="px-5 py-3.5 text-left font-medium text-ink-2">Last sign-in</th>
            <th className="px-5 py-3.5 text-right font-medium text-ink-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-line last:border-0 ${row.disabled ? 'opacity-60' : ''}`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Initials name={row.displayName} email={row.email} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-ink">{row.email}</span>
                      {row.isSelf ? (
                        <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-[10px] font-medium text-ink-2">
                          You
                        </span>
                      ) : null}
                      {row.isBootstrap ? (
                        <span
                          title="Bootstrap admin — protected from revocation"
                          className="shrink-0 text-amber-600"
                        >
                          <MdOutlineShield size={14} />
                        </span>
                      ) : null}
                    </div>
                    {row.displayName ? (
                      <span className="truncate text-xs text-ink-3">{row.displayName}</span>
                    ) : null}
                  </div>
                </div>
              </td>

              <td className="px-5 py-4">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    row.disabled ? 'bg-danger-50 text-danger-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {row.disabled ? 'Disabled' : 'Active'}
                </span>
              </td>

              <td className="px-5 py-4">
                {row.totpEnrolled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <MdOutlineVerifiedUser size={14} />
                    <span className="text-xs font-medium">TOTP</span>
                  </span>
                ) : (
                  <span className="text-xs text-ink-3">Not enrolled</span>
                )}
              </td>

              <td className="px-5 py-4 text-ink-2">
                {row.lastSignInAt ? (
                  formatDateTime(row.lastSignInAt)
                ) : (
                  <span className="text-ink-3">Never</span>
                )}
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-2">
                  <RevokeButton row={row} />
                  <Link
                    href={`/users/${row.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-line-strong hover:bg-raised"
                  >
                    Manage
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
