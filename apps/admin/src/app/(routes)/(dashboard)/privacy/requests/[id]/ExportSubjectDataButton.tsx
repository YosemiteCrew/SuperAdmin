'use client';

import { useState, useTransition } from 'react';

import { exportSubjectDataAction } from './actions';

export function ExportSubjectDataButton({ requestId }: Readonly<{ requestId: string }>) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function handleExport() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', requestId);
      const json = await exportSubjectDataAction(fd);
      if (!json) {
        setFailed(true);
        return;
      }
      setFailed(false);

      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
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
        className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'Exporting…' : 'Export subject data'}
      </button>
      {failed && (
        <p role="alert" className="text-xs text-red-600">
          The export could not be produced. The request may have been deleted.
        </p>
      )}
    </div>
  );
}
