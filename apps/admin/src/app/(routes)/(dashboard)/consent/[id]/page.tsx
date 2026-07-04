import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { getSubjectDetail } from '@/app/features/consent/store';
import type { ConsentCategory } from '@/app/features/consent/types';

export const metadata: Metadata = { title: 'Consent history' };

const CATEGORY_LABEL: Record<ConsentCategory, string> = {
  analytics: 'Analytics',
  marketing: 'Marketing',
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });
}

export default async function ConsentDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const { id } = await params;
  const detail = await getSubjectDetail(id);
  if (!detail) notFound();

  const { subject, history } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/consent" className="text-sm text-ink-2 hover:text-ink">
          ← Back to consent
        </Link>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          {subject.email ?? 'Anonymous subject'}
        </h1>
        <p className="font-mono text-xs text-ink-3">{subject.consentId}</p>
        {subject.userId ? (
          <Link href={`/users/${subject.userId}`} className="text-sm text-ink-2 hover:underline">
            Linked account →
          </Link>
        ) : (
          <p className="text-sm text-ink-3">Not linked to an account</p>
        )}
      </header>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="border-b border-line bg-raised px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-2">
            Audit trail ({history.length} event{history.length === 1 ? '' : 's'})
          </h2>
        </div>
        {history.length === 0 ? (
          <p className="p-5 text-sm text-ink-3">No consent events for this subject.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-2">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Decision</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Policy</th>
              </tr>
            </thead>
            <tbody>
              {history.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3 text-ink-2">
                    <time dateTime={e.createdAt.toISOString()}>
                      {formatDate(e.createdAt.getTime())}
                    </time>
                  </td>
                  <td className="px-5 py-3 text-ink">{CATEGORY_LABEL[e.category] ?? e.category}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        e.granted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
                      }`}
                    >
                      {e.granted ? 'Granted' : 'Withdrawn'}
                    </span>
                  </td>
                  <td className="px-5 py-3 capitalize text-ink-2">{e.source}</td>
                  <td className="px-5 py-3 text-ink-3">{e.policyVersion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
