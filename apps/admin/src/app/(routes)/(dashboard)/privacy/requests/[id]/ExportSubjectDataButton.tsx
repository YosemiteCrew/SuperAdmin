'use client';

import { useState, useTransition } from 'react';

import { exportSubjectDataAction } from './actions';

export function ExportSubjectDataButton({ requestId }: Readonly<{ requestId: string }>) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [auditFailed, setAuditFailed] = useState(false);

  function handleExport() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', requestId);
      const result = await exportSubjectDataAction(fd);
      if (!result) {
        setFailed(true);
        setAuditFailed(false);
        return;
      }
      setFailed(false);
      setAuditFailed(!result.auditRecorded);

      const blob = new Blob([result.json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subject-data-${requestId}-${new Date().toISOString().slice(0, 10)}.json`;
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
        disabled={pending}
        className="yc-primary-button inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
      >
        <span>{pending ? 'Exporting…' : 'Export subject data'}</span>
      </button>
      {failed && (
        <p role="alert" className="text-xs text-[color:var(--danger-text)]">
          The export could not be produced. The request may have been deleted.
        </p>
      )}
      {auditFailed && (
        <p role="alert" className="text-xs text-[color:var(--warn-text)]">
          The export was produced, but its audit record could not be written. Record this disclosure
          in the request notes before sending the file.
        </p>
      )}
    </div>
  );
}
