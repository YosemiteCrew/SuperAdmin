import type { Metadata } from 'next';
import { ensureSuperTokensInit } from '@/app/config/backend';
import { collectSystemHealth, formatUptime } from '@/app/features/health';
import type { SystemHealth } from '@/app/features/health/types';

export const metadata: Metadata = {
  title: 'System Health',
};

export const dynamic = 'force-dynamic';

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
      aria-hidden
    />
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-ink-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 last:border-b-0">
      <span className="text-sm text-ink-3">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

function HealthReport({ h }: { h: SystemHealth }) {
  const stOk = h.supertokens.status === 'ok';

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card title="Services">
        <Row
          label="SuperTokens"
          value={
            <span className="flex items-center gap-2">
              <StatusDot ok={stOk} />
              {stOk ? `OK - ${h.supertokens.latencyMs}ms` : `Error - ${h.supertokens.error}`}
            </span>
          }
        />
        <Row label="Total users" value={h.totalUsers.toLocaleString()} />
        <Row label="Super-admins" value={h.adminCount} />
      </Card>

      <Card title="Runtime">
        <Row label="Environment" value={h.env} />
        <Row label="Node.js" value={h.nodeVersion} />
        <Row label="Build" value={h.buildSha === 'local' ? 'local dev' : h.buildSha.slice(0, 7)} />
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
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight text-ink">System Health</h1>
          <p className="text-sm text-ink-3">Live status of services and runtime environment.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium">
          <StatusDot ok={overallOk} />
          {overallOk ? 'All systems operational' : 'Degraded'}
        </div>
      </header>

      <HealthReport h={health} />
    </div>
  );
}
