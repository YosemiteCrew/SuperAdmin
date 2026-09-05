'use client';

import { useTransition } from 'react';

import { exportAccountDataAction } from './actions';

export function ExportAccountDataButton({ userId }: Readonly<{ userId: string }>) {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('userId', userId);
      const json = await exportAccountDataAction(fd);
      if (!json) return;

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
    <button
      type="button"
      onClick={handleExport}
      disabled={pending}
      className="inline-flex h-[38px] items-center justify-center gap-[7px] rounded-full border border-[color:var(--divider)] bg-transparent px-4 text-[13px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--pill-raised)] disabled:opacity-60"
    >
      {pending ? 'Exporting…' : 'Export account data'}
    </button>
  );
}
