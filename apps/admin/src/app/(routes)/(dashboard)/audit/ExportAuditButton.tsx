'use client';

import { eventsToCsv } from '@/app/features/audit/csv';
import type { AuditEvent } from '@/app/features/audit/types';

export function ExportAuditButton({ events }: Readonly<{ events: AuditEvent[] }>) {
  function handleExport() {
    const csv = eventsToCsv(events);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={events.length === 0}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-raised disabled:opacity-60"
    >
      Export CSV
    </button>
  );
}
