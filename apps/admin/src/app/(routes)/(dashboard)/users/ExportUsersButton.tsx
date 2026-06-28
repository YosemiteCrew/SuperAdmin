'use client';

import { useTransition } from 'react';

import { exportUsersAction } from './actions';

export function ExportUsersButton() {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const csv = await exportUsersAction();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-raised disabled:opacity-60"
    >
      {pending ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}
