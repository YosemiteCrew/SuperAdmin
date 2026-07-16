import type { Metadata } from 'next';
import { ensureSuperTokensInit } from '@/app/config/backend';
import { collectSystemHealth, formatUptime } from '@/app/features/health';
import type { SystemHealth } from '@/app/features/health/types';

export const metadata: Metadata = {
  title: 'System Health',
};

export const dynamic = 'force-dynamic';

const CARD =
  'flex flex-col overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const CARD_HEAD =
  'border-b border-[var(--hairline)] bg-[var(--screen-2)] px-5 py-[11px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const ROW =
  'flex items-center justify-between gap-4 border-b border-[var(--hairline-soft)] py-[10px] last:border-b-0';

/**
 * Green reads as "a good status" here, never decoration: the dot is the live
 * service signal, so it flips to danger the moment a check fails.
 */
function StatusDot({ ok, size }: { readonly ok: boolean; readonly size: 7 | 8 }) {
  return (
    <span
      className={`inline-block flex-none rounded-full ${
        size === 7 ? 'h-[7px] w-[7px]' : 'h-2 w-2'
      } ${ok ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
      aria-hidden
    />
  );
}

function Card({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className={CARD}>
      <h2 className={CARD_HEAD}>{title}</h2>
      <div className="flex flex-col px-5 py-1">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly mono?: boolean;
}) {
  return (
    <div className={ROW}>
      <span className="text-[13px] text-[color:var(--ink-faint)]">{label}</span>
      <span
        className={`text-right text-[13.5px] font-semibold text-[color:var(--ink)] ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function HealthReport({ h }: { readonly h: SystemHealth }) {
  const stOk = h.supertokens.status === 'ok';

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Services">
        <Row
          label="SuperTokens core"
          value={
            <span className="flex items-center justify-end gap-2">
              <StatusDot ok={stOk} size={8} />
              {stOk ? `OK · ${h.supertokens.latencyMs} ms` : `Error · ${h.supertokens.error}`}
            </span>
          }
        />
        <Row label="Total users" value={h.totalUsers.toLocaleString()} />
        <Row label="Super admins" value={h.adminCount} />
      </Card>

      <Card title="Runtime">
        <Row label="Environment" value={h.env} />
        <Row label="Node.js" value={h.nodeVersion} mono />
        <Row
          label="Build"
          value={h.buildSha === 'local' ? 'local dev' : h.buildSha.slice(0, 7)}
          mono
        />
        <Row label="Process uptime" value={formatUptime(h.uptimeSec)} />
      </Card>

      <Card title="Memory">
        <Row label="RSS" value={`${h.memory.rssmb} MB`} />
        <Row label="Heap used" value={`${h.memory.heapUsedMb} / ${h.memory.heapTotalMb} MB`} />
      </Card>
    </div>
  );
}

export default async function HealthPage() {
  ensureSuperTokensInit();
  const health = await collectSystemHealth();

  const overallOk = health.supertokens.status === 'ok';

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
            System health
          </h1>
          <p className="text-[13.5px] text-[color:var(--ink-muted)]">
            Live status of services and runtime environment
          </p>
        </div>
        {/* A status readout, so it earns green when everything is up and swaps to
            danger the moment it is not. */}
        <div
          className={`inline-flex h-9 flex-none items-center gap-2 self-start rounded-full border px-[14px] text-[12.5px] font-bold ${
            overallOk
              ? 'border-[var(--success)]/40 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]'
              : 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]'
          }`}
        >
          <StatusDot ok={overallOk} size={7} />
          {overallOk ? 'All systems operational' : 'Degraded'}
        </div>
      </header>

      <HealthReport h={health} />
    </div>
  );
}
