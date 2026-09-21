'use client';

import { useState, useTransition } from 'react';
import { IoDownloadOutline } from 'react-icons/io5';

import { exportAuditAction, type AuditExportFilters } from './actions';

export function ExportAuditButton({
  filters,
  disabled,
}: Readonly<{ filters: AuditExportFilters; disabled: boolean }>) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function handleExport() {
    startTransition(async () => {
      setFailed(false);
      let csv: string;
      try {
        csv = await exportAuditAction(filters);
      } catch {
        // The export reads the database on the server, so unlike the old
        // in-browser build it can reject. Without this the transition never
        // settles: the button stays disabled reading "Exporting…" for the rest
        // of the session, and the rejection escapes to the nearest error
        // boundary - on the one page whose job is to be trustworthy.
        setFailed(true);
        return;
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || pending}
        className="inline-flex h-[38px] items-center justify-center gap-[7px] rounded-full border border-[color:var(--divider)] bg-transparent px-4 text-[13px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--pill-raised)] disabled:opacity-60"
      >
        <IoDownloadOutline aria-hidden className="text-[15px]" />
        {pending ? 'Exporting…' : 'Export CSV'}
      </button>
      {failed && (
        <p role="alert" className="text-xs text-[color:var(--danger-text)]">
          The export could not be produced. Please try again.
        </p>
      )}
    </div>
  );
}
