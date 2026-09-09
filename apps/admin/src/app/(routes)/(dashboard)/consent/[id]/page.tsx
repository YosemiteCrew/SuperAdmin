import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IoArrowBack, IoArrowForward, IoLockClosedOutline } from 'react-icons/io5';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { getSubjectDetail, type CategoryState } from '@/app/features/consent/store';
import type { ConsentCategory } from '@/app/features/consent/types';

export const metadata: Metadata = { title: 'Consent history' };

const CARD =
  'overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const CARD_HEAD =
  'border-b border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[11px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const BACK_LINK =
  'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]';
const TH =
  'px-[18px] py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const TD = 'px-[18px] py-3 text-[13.5px] text-[color:var(--ink-muted)]';
const BADGE =
  'inline-flex rounded-full border px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]';
const FOOTER_NOTE =
  'border-t border-[var(--hairline)] px-5 py-3 text-[12px] text-[color:var(--ink-faint)]';

const CATEGORY_LABEL: Record<ConsentCategory, string> = {
  analytics: 'Analytics',
  marketing: 'Marketing',
};

const CATEGORIES: ConsentCategory[] = ['analytics', 'marketing'];

/**
 * Warm-bone tokens per consent state, mirroring VERIFICATION_META: granted reads
 * as success, withdrawn as danger, unset as a neutral inset pill. All resolve
 * through theme-aware CSS variables, so the badges follow light and dark.
 */
const STATE_STYLE: Record<CategoryState, string> = {
  granted:
    'border-[var(--avatar-green-ink)]/30 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  withdrawn: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
  unset: 'border-[var(--hairline)] bg-[var(--inset)] text-[color:var(--ink-faint)]',
};

const STATE_LABEL: Record<CategoryState, string> = {
  granted: 'Granted',
  withdrawn: 'Withdrawn',
  unset: 'Not set',
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

function initialsFor(email: string | null): string {
  if (!email) return '—';
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || '—';
}

function StateBadge({ state }: Readonly<{ state: CategoryState }>) {
  return <span className={`${BADGE} ${STATE_STYLE[state]}`}>{STATE_LABEL[state]}</span>;
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
      <span className="text-[color:var(--ink-faint)]">{label}</span>
      <span className="font-semibold text-[color:var(--ink)]">{value}</span>
    </div>
  );
}

function SubjectHeader({
  email,
  consentId,
  userId,
}: Readonly<{ email: string | null; consentId: string; userId: string | null }>) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-[14px]">
        <span
          aria-hidden
          className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full bg-[var(--avatar-violet-bg)] text-[14px] font-bold text-[color:var(--avatar-violet-ink)]"
        >
          {initialsFor(email)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="font-[family-name:var(--font-serif-display)] text-[27px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
            {email ?? 'Anonymous subject'}
          </h1>
          <p className="truncate font-mono text-[11.5px] text-[color:var(--ink-faint)]">
            {consentId}
          </p>
        </div>
      </div>
      {userId ? (
        <Link
          href={`/users/${userId}`}
          className="inline-flex flex-none items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--blue-text)] hover:underline"
        >
          Linked account
          <IoArrowForward aria-hidden className="text-[12px]" />
        </Link>
      ) : (
        <p className="flex-none text-[12.5px] text-[color:var(--ink-faint)]">
          Not linked to an account
        </p>
      )}
    </header>
  );
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

  // The newest event by `seq`, which the store orders desc — exact even within a
  // millisecond. Only facts read off this row feed the Subject panel; anything
  // needing the OLDEST event (a "first seen") is omitted, because the store caps
  // the trail at its newest 500 and the oldest row fetched is not necessarily
  // the first one that ever landed.
  const latest = history[0];

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <Link href="/consent" className={BACK_LINK}>
          <IoArrowBack aria-hidden className="text-[12px]" />
          Back to consent
        </Link>
      </div>

      <SubjectHeader email={subject.email} consentId={subject.consentId} userId={subject.userId} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2.1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <section className={CARD}>
            <h2 className={CARD_HEAD}>Current state</h2>
            <div>
              {CATEGORIES.map((c) => (
                <div
                  key={c}
                  className="flex items-center justify-between gap-3 border-b border-[var(--hairline)] px-[18px] py-[14px] last:border-b-0"
                >
                  <span className="text-[13.5px] font-semibold text-[color:var(--ink)]">
                    {CATEGORY_LABEL[c]}
                  </span>
                  <StateBadge state={subject.state[c]} />
                </div>
              ))}
            </div>
          </section>

          {latest ? (
            <section className={CARD}>
              <h2 className={CARD_HEAD}>Subject</h2>
              <div className="flex flex-col gap-[11px] px-[18px] py-[14px]">
                <InfoRow label="Last decision" value={formatDate(latest.createdAt.getTime())} />
                <InfoRow label="Policy version" value={latest.policyVersion ?? '—'} />
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-[7px] rounded-[18px] border border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-4">
            <h2 className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">
              <IoLockClosedOutline aria-hidden className="text-[12px]" />
              Why read-only
            </h2>
            <p className="text-[12.5px] leading-[1.6] text-[color:var(--ink-muted)]">
              Consent can only be changed by the pet parent, in the app. The panel shows the
              evidence; it never edits it.
            </p>
          </section>
        </div>

        <section className={CARD}>
          <h2 className={CARD_HEAD}>
            Audit trail ({history.length} event{history.length === 1 ? '' : 's'})
          </h2>
          {history.length === 0 ? (
            <p className="p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]">
              No consent events for this subject.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--hairline)] bg-[var(--screen-2)] text-left">
                    <th className={TH}>When</th>
                    <th className={TH}>Category</th>
                    <th className={TH}>Decision</th>
                    <th className={TH}>Source</th>
                    <th className={TH}>Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-[color:var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--surface-soft)]"
                    >
                      <td className={`${TD} tabular-nums`}>
                        <time dateTime={e.createdAt.toISOString()}>
                          {formatDate(e.createdAt.getTime())}
                        </time>
                      </td>
                      <td className="px-[18px] py-3 text-[13.5px] font-semibold text-[color:var(--ink)]">
                        {CATEGORY_LABEL[e.category] ?? e.category}
                      </td>
                      <td className="px-[18px] py-3">
                        <StateBadge state={e.granted ? 'granted' : 'withdrawn'} />
                      </td>
                      <td className={`${TD} capitalize`}>{e.source}</td>
                      <td className="px-[18px] py-3 text-[13.5px] text-[color:var(--ink-faint)]">
                        {e.policyVersion ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={FOOTER_NOTE}>
            Ordered by sequence, newest first. Sequence order is exact even within the same
            millisecond.
          </p>
        </section>
      </div>
    </div>
  );
}
