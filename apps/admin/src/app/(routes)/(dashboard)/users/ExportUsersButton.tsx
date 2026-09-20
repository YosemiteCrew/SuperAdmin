'use client';

import { useState, useTransition } from 'react';
import { IoDownloadOutline } from 'react-icons/io5';

import { exportUsersAction } from './actions';

export function ExportUsersButton() {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function handleExport() {
    startTransition(async () => {
      let csv: string;
      try {
        csv = await exportUsersAction();
      } catch {
        // Uncaught, React 19 would rethrow this into the app error boundary and
        // replace the dashboard shell over a failed download.
        setFailed(true);
        return;
      }
      setFailed(false);

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
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={handleExport}
        disabled={pending}
        className="inline-flex h-[38px] items-center justify-center gap-[7px] rounded-full border border-[color:var(--divider)] px-4 text-[13px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-60"
      >
        <IoDownloadOutline aria-hidden="true" className="text-[15px]" />
        {pending ? 'Exporting…' : 'Export CSV'}
      </button>
      {failed && (
        <p role="alert" className="text-xs text-[color:var(--danger-text)]">
          The export could not be produced. Try again.
        </p>
      )}
    </div>
  );
}
