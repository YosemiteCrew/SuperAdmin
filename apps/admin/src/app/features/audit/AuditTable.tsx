import { AUDIT_META, type AuditSeverity } from './audit';
import type { AuditEvent } from './types';

const SEVERITY_DOT: Record<AuditSeverity, string> = {
  info: 'bg-[var(--ink-faint2)]',
  warning: 'bg-[var(--warn)]',
  danger: 'bg-[var(--danger)]',
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
      <div className="rounded-[18px] border border-dashed border-[color:var(--divider)] bg-[var(--screen)] p-10 text-center text-[13px] text-[color:var(--ink-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[color:var(--hairline)] bg-[var(--screen-2)] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
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
                className="border-b border-[color:var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--screen-2)]"
              >
                <td className="px-5 py-3 tabular-nums text-[color:var(--ink-muted)]">
                  <time dateTime={new Date(event.at).toISOString()}>
                    {formatTimestamp(event.at)}
                  </time>
                </td>
                <td className="px-5 py-3 font-medium text-[color:var(--ink)]">
                  {event.actorEmail}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-[9px] text-[color:var(--ink)]">
                    <span
                      aria-hidden
                      className={`inline-block h-2 w-2 flex-none rounded-full ${SEVERITY_DOT[severity]}`}
                    />
                    {meta?.label ?? event.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-[color:var(--ink-muted)]">
                  <span>{event.targetLabel?.trim() || event.targetId}</span>
                  <span className="ml-2 rounded-full bg-[var(--inset)] px-[9px] py-[2.5px] text-[10px] font-bold capitalize tracking-[0.06em] text-[color:var(--ink-faint)]">
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
