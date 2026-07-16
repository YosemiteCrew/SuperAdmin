'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import {
  bulkDeleteUsersAction,
  bulkDisableUsersAction,
  bulkEnableUsersAction,
} from './bulkActions';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { UserRowActions } from './UserRowActions';

export type UserRow = {
  id: string;
  primaryEmail: string;
  extraEmailCount: number;
  methods: string;
  tenants: string;
  shortId: string;
  lastSeen: string;
  lastSeenTitle: string;
  disabled: boolean;
};

const BULK_BTN =
  'inline-flex h-8 items-center justify-center rounded-full border px-[14px] text-[12.5px] font-semibold transition-colors disabled:opacity-60';

const TH =
  'px-[18px] py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const TD = 'px-[18px] py-3 text-[13.5px] text-[color:var(--ink-muted)]';

const AVATAR_PALETTE = [
  'bg-[var(--avatar-violet-bg)] text-[color:var(--avatar-violet-ink)]',
  'bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  'bg-[var(--avatar-amber-bg)] text-[color:var(--avatar-amber-ink)]',
];

function initialsFor(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || '—';
}

function avatarClassFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash + char.codePointAt(0)!) % 255;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function UsersTable({ rows }: Readonly<{ rows: UserRow[] }>) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const someSelected = selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  function run(action: (ids: string[]) => Promise<void>, confirmMessage: string) {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!globalThis.confirm(confirmMessage)) return;
    startTransition(async () => {
      await action(ids);
      setSelected(new Set());
    });
  }

  function confirmBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkDeleteUsersAction(ids);
      setSelected(new Set());
      setDeleteOpen(false);
    });
  }

  const count = selected.size;
  const noun = count === 1 ? 'user' : 'users';

  return (
    <div className="flex flex-col gap-3">
      {someSelected ? (
        <div className="flex flex-wrap items-center gap-[10px] rounded-[14px] border border-[color:var(--hairline)] bg-[var(--inset)] px-4 py-[10px]">
          <span className="text-[13.5px] font-bold text-[color:var(--ink)]">
            {count} {noun} selected
          </span>
          <div className="ml-auto flex items-center gap-[10px]">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  bulkDisableUsersAction,
                  `Disable ${count} ${noun}? They will be signed out everywhere.`
                )
              }
              className={`${BULK_BTN} border-[color:var(--warn-border)] text-[color:var(--warn-text)] hover:bg-[var(--warn-bg)]`}
            >
              Disable
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(bulkEnableUsersAction, `Re-enable ${count} ${noun}?`)}
              className={`${BULK_BTN} border-[color:var(--divider)] text-[color:var(--ink)] hover:bg-[var(--surface-soft)]`}
            >
              Enable
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDeleteOpen(true)}
              className={`${BULK_BTN} border-[color:var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)] hover:bg-[var(--danger-bg)]`}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[color:var(--hairline)] bg-[var(--screen-2)] text-left [&>th:first-child]:rounded-tl-[18px] [&>th:last-child]:rounded-tr-[18px]">
              <th className={`${TH} w-11`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all users"
                  className="accent-[var(--blue)]"
                />
              </th>
              <th className={TH}>Email</th>
              <th className={TH}>Login method</th>
              <th className={TH}>Tenants</th>
              <th className={TH}>User ID</th>
              <th className={TH}>Last seen</th>
              <th className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td:first-child]:rounded-bl-[18px] [&>tr:last-child>td:last-child]:rounded-br-[18px]">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[color:var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--surface-soft)]"
              >
                <td className="px-[18px] py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`Select ${row.primaryEmail}`}
                    className="accent-[var(--blue)]"
                  />
                </td>
                <td className="px-[18px] py-3">
                  <span className="flex min-w-0 items-center gap-[10px]">
                    <span
                      aria-hidden="true"
                      className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-bold ${avatarClassFor(row.id)}`}
                    >
                      {initialsFor(row.primaryEmail)}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Link
                        href={`/users/${row.id}`}
                        className="truncate text-[13.5px] font-semibold text-[color:var(--ink)] hover:underline"
                      >
                        {row.primaryEmail}
                      </Link>
                      {row.extraEmailCount > 0 ? (
                        <span className="flex-none text-[11.5px] text-[color:var(--ink-faint)]">
                          (+{row.extraEmailCount})
                        </span>
                      ) : null}
                      {row.disabled ? (
                        <span className="flex-none rounded-full border border-[color:var(--warn-border)] bg-[var(--warn-bg)] px-[9px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--warn-text)]">
                          Disabled
                        </span>
                      ) : null}
                    </span>
                  </span>
                </td>
                <td className={TD}>{row.methods}</td>
                <td className={TD}>{row.tenants}</td>
                <td
                  className="px-[18px] py-3 font-mono text-[11.5px] text-[color:var(--ink-faint)]"
                  title={row.id}
                >
                  {row.shortId}
                </td>
                <td className={TD} title={row.lastSeenTitle}>
                  {row.lastSeen}
                </td>
                <td className="px-[18px] py-3 text-right">
                  <UserRowActions userId={row.id} email={row.primaryEmail} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        count={count}
        pending={pending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}
