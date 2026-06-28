import { AUDIT_META, type AuditSeverity } from './audit';
import type { AuditEvent } from './types';

const SEVERITY_DOT: Record<AuditSeverity, string> = {
  info: 'bg-ink-3',
  warning: 'bg-warning-600',
  danger: 'bg-danger-600',
};

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AuditTable({
  events,
  emptyMessage = 'No activity matches these filters.',
}: Readonly<{ events: AuditEvent[]; emptyMessage?: string }>) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center text-sm text-ink-3">
        {emptyMessage}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-raised text-left text-xs font-medium uppercase tracking-wide text-ink-2">
            <th className="px-5 py-3">When</th>
            <th className="px-5 py-3">Actor</th>
            <th className="px-5 py-3">Action</th>
            <th className="px-5 py-3">Target</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const meta = AUDIT_META[event.action];
            const severity = meta?.severity ?? 'info';
            return (
              <tr
                key={event.id}
                className="border-b border-line last:border-b-0 hover:bg-raised/60"
              >
                <td className="px-5 py-3 text-ink-2">
                  <time dateTime={new Date(event.at).toISOString()}>
                    {formatTimestamp(event.at)}
                  </time>
                </td>
                <td className="px-5 py-3 text-ink">{event.actorEmail}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-2 text-ink">
                    <span
                      aria-hidden
                      className={`inline-block h-2 w-2 flex-none rounded-full ${SEVERITY_DOT[severity]}`}
                    />
                    {meta?.label ?? event.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-2">
                  <span>{event.targetLabel?.trim() || event.targetId}</span>
                  <span className="ml-2 rounded-full bg-raised px-2 py-0.5 text-xs capitalize text-ink-3">
                    {event.targetType}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
