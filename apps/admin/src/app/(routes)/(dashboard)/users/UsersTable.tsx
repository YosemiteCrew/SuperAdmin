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
  'inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60';

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
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-raised px-4 py-2 text-sm">
          <span className="font-medium text-ink">
            {count} {noun} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  bulkDisableUsersAction,
                  `Disable ${count} ${noun}? They will be signed out everywhere.`
                )
              }
              className={`${BULK_BTN} border-warning-600 text-warning-800 hover:bg-warning-100`}
            >
              Disable
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(bulkEnableUsersAction, `Re-enable ${count} ${noun}?`)}
              className={`${BULK_BTN} border-line text-ink hover:bg-surface`}
            >
              Enable
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDeleteOpen(true)}
              className={`${BULK_BTN} border-danger-600 text-danger-600 hover:bg-danger-600 hover:text-white`}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-raised text-left text-xs font-medium uppercase tracking-wide text-ink-2">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all users"
                />
              </th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Login method</th>
              <th className="px-4 py-3">Tenants</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-b-0 hover:bg-raised/60">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`Select ${row.primaryEmail}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/users/${row.id}`} className="font-medium text-ink hover:underline">
                    {row.primaryEmail}
                  </Link>
                  {row.extraEmailCount > 0 ? (
                    <span className="ml-1 text-xs text-ink-3">(+{row.extraEmailCount})</span>
                  ) : null}
                  {row.disabled ? (
                    <span className="ml-2 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-800">
                      Disabled
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-ink-2">{row.methods}</td>
                <td className="px-4 py-3 text-ink-2">{row.tenants}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-3" title={row.id}>
                  {row.shortId}
                </td>
                <td className="px-4 py-3 text-ink-2" title={row.lastSeenTitle}>
                  {row.lastSeen}
                </td>
                <td className="px-4 py-3 text-right">
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
