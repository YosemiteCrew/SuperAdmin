import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { AUDIT_META } from '@/app/features/audit/audit';
import { AuditTimeline } from '@/app/features/audit/AuditTimeline';
import { getAuditEventsForTarget } from '@/app/features/audit/store';
import type { AuditAction } from '@/app/features/audit/types';
import { getOrganization } from '@/app/features/organizations/services/organizationsService';

const ACTIVITY_LIMIT = 50;

const CARD =
  'overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const CARD_HEAD =
  'border-b border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[10px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const BACK_LINK =
  'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  ensureSuperTokensInit();
  const { id } = await params;
  try {
    const org = await getOrganization(id);
    return { title: `${org.name} - Activity` };
  } catch {
    return { title: 'Organization Activity' };
  }
}

function ActionPill({ action }: { readonly action: AuditAction }) {
  const label = AUDIT_META[action]?.label ?? action;
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-[var(--hairline)] bg-[var(--inset)] px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--ink-muted)]">
      {label}
    </span>
  );
}

export default async function OrgActivityPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const { id } = await params;

  let orgName: string | null = null;
  try {
    const org = await getOrganization(id);
    orgName = org.name;
  } catch {
    /* backend not connected — activity still available from local audit log */
  }

  const events = await getAuditEventsForTarget(id, ACTIVITY_LIMIT);

  const actionCounts = new Map<AuditAction, number>();
  for (const event of events) {
    actionCounts.set(event.action, (actionCounts.get(event.action) ?? 0) + 1);
  }
  const topActions = [...actionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1">
        <Link href={`/organizations/${id}`} className={BACK_LINK}>
          ← Back to {orgName ?? 'organization'}
        </Link>
      </div>

      <header className="flex flex-col gap-[3px]">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          {orgName ? `${orgName} - Activity` : 'Organization activity'}
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          Admin actions targeting this organization (last {ACTIVITY_LIMIT} events).
        </p>
      </header>

      {topActions.length > 0 ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {topActions.map(([action, count]) => (
            <div key={action} className={`flex flex-col gap-2 p-[18px] ${CARD}`}>
              <p className="text-[32px] font-bold leading-none tracking-[-0.02em] text-[color:var(--ink)] tabular-nums">
                {count}
              </p>
              <ActionPill action={action} />
            </div>
          ))}
        </section>
      ) : null}

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Event history</h2>
        <AuditTimeline
          events={events}
          showTarget={false}
          emptyMessage="No admin actions have been recorded for this organization yet."
        />
      </section>

      <p className="text-[12px] text-[color:var(--ink-faint)]">
        Showing the most recent {ACTIVITY_LIMIT} events. Full history is in the{' '}
        <Link href="/audit" className="underline transition-colors hover:text-[color:var(--ink)]">
          audit log
        </Link>
        .
      </p>
    </div>
  );
}
