'use client';

import { useTransition } from 'react';
import { IoDownloadOutline } from 'react-icons/io5';

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
      className="inline-flex h-[38px] items-center justify-center gap-[7px] rounded-full border border-[color:var(--divider)] px-4 text-[13px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-60"
    >
      <IoDownloadOutline aria-hidden="true" className="text-[15px]" />
      {pending ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}
