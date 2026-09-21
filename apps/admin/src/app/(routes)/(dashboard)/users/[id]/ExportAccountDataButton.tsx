'use client';

import { useState, useTransition } from 'react';

import { exportAccountDataAction } from './actions';

export function ExportAccountDataButton({ userId }: Readonly<{ userId: string }>) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function handleExport() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('userId', userId);
      let json: string | null;
      try {
        json = await exportAccountDataAction(fd);
      } catch {
        // Uncaught, React 19 would rethrow this into the app error boundary and
        // replace the dashboard shell over a failed download.
        setFailed(true);
        return;
      }
      if (!json) {
        setFailed(true);
        return;
      }
      setFailed(false);

      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `account-data-${userId}-${new Date().toISOString().slice(0, 10)}.json`;
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
        className="inline-flex h-[38px] items-center justify-center gap-[7px] rounded-full border border-[color:var(--divider)] bg-transparent px-4 text-[13px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--pill-raised)] disabled:opacity-60"
      >
        {pending ? 'Exporting…' : 'Export account data'}
      </button>
      {failed && (
        <p role="alert" className="text-xs text-[color:var(--danger-text)]">
          The account data could not be produced. The account may have been deleted.
        </p>
      )}
    </div>
  );
}
