'use client';

import { useState, useTransition } from 'react';

import type { SubjectErasureReport } from '@/app/features/dataRequests/subjectErasure';

import { eraseSubjectDataAction } from './actions';

/**
 * The erasure control, shown only on a request that asked for one.
 *
 * Two steps rather than one, because this cannot be undone and it sits one
 * click away from a record view an operator opens to read. The confirmation
 * step spells out what goes and what stays, so the decision is made against the
 * actual consequence rather than against the word "erase".
 */
export function EraseSubjectDataButton({ requestId }: Readonly<{ requestId: string }>) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [report, setReport] = useState<SubjectErasureReport | null>(null);
  const [failed, setFailed] = useState(false);

  function handleErase() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', requestId);
      const result = await eraseSubjectDataAction(fd);
      setConfirming(false);
      if (!result) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setReport(result);
    });
  }

  if (report) {
    return (
      <div role="status" className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
        <p className="font-medium text-gray-900">Erased {report.subjectEmail}</p>
        <ul className="mt-1 space-y-0.5 text-gray-700">
          <li>
            Deleted: {report.deleted.contactLeads} marketing lead
            {report.deleted.contactLeads === 1 ? '' : 's'} and {report.deleted.contactRequests}{' '}
            contact submission{report.deleted.contactRequests === 1 ? '' : 's'}.
          </li>
          <li>
            Kept, with the address removed: {report.retained.consentSubjects} consent subject
            {report.retained.consentSubjects === 1 ? '' : 's'} and {report.retained.consentEvents}{' '}
            consent event{report.retained.consentEvents === 1 ? '' : 's'} — the ledger is the
            evidence consent was obtained and withdrawal honoured.
          </li>
          <li>
            Kept: {report.retained.dataRequests} rights request
            {report.retained.dataRequests === 1 ? '' : 's'} — the record that this was received and
            answered.
          </li>
        </ul>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="max-w-md rounded border border-red-200 bg-red-50 px-3 py-2 text-sm">
        <p className="font-medium text-red-900">Erase this subject permanently?</p>
        <p className="mt-1 text-red-800">
          The marketing lead and every contact-form submission under it are deleted. The consent
          ledger and this request are kept, with the address removed from the ledger, because they
          are the evidence that consent was obtained and that this request was answered. This cannot
          be undone.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleErase}
            disabled={pending}
            className="inline-flex items-center rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? 'Erasing…' : 'Yes, erase permanently'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="inline-flex items-center rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Erase subject data
      </button>
      {failed && (
        <p role="alert" className="text-xs text-red-600">
          Nothing was erased. The request may have been deleted, or it may not be an erasure
          request.
        </p>
      )}
    </div>
  );
}
