import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { AUDIT_META } from '@/app/features/audit/audit';
import { AuditTimeline } from '@/app/features/audit/AuditTimeline';
import { getAuditEventsForTarget } from '@/app/features/audit/store';
import type { AuditAction } from '@/app/features/audit/types';
import { getOrganization } from '@/app/features/organizations/services/organizationsService';

const ACTIVITY_LIMIT = 50;

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

function ActionPill({ action }: { action: AuditAction }) {
  const label = AUDIT_META[action]?.label ?? action;
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-raised px-2 py-0.5 text-xs font-medium text-ink-2">
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/organizations/${id}`} className="text-sm text-ink-2 hover:text-ink">
          ← Back to {orgName ?? 'organization'}
        </Link>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          {orgName ? `${orgName} - Activity` : 'Organization activity'}
        </h1>
        <p className="text-sm text-ink-3">
          Admin actions targeting this organization (last {ACTIVITY_LIMIT} events).
        </p>
      </header>

      {topActions.length > 0 ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {topActions.map(([action, count]) => (
            <div
              key={action}
              className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]"
            >
              <p className="text-2xl font-medium tracking-tight text-ink">{count}</p>
              <ActionPill action={action} />
            </div>
          ))}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="border-b border-line bg-raised px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-2">Event history</h2>
        </div>
        <AuditTimeline
          events={events}
          showTarget={false}
          emptyMessage="No admin actions have been recorded for this organization yet."
        />
      </section>

      <p className="text-xs text-ink-3">
        Showing the most recent {ACTIVITY_LIMIT} events. Full history is in the{' '}
        <Link href="/audit" className="underline hover:text-ink">
          audit log
        </Link>
        .
      </p>
    </div>
  );
}
