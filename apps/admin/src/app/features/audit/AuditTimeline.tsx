import { AUDIT_META, describeAuditEvent, type AuditSeverity } from './audit';
import type { AuditEvent } from './types';

// Severity reads off the dot alone, so it carries the only colour in the row.
const SEVERITY_DOT: Record<AuditSeverity, string> = {
  info: 'bg-[var(--ink-faint)]',
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

export function AuditTimeline({
  events,
  emptyMessage = 'No recorded activity yet.',
  showTarget = false,
}: Readonly<{ events: AuditEvent[]; emptyMessage?: string; showTarget?: boolean }>) {
  if (events.length === 0) {
    return <div className="p-5 text-[13.5px] text-[color:var(--ink-faint)]">{emptyMessage}</div>;
  }

  return (
    <ul className="flex flex-col">
      {events.map((event) => {
        const severity = AUDIT_META[event.action]?.severity ?? 'info';
        return (
          <li
            key={event.id}
            className="flex items-start gap-3 border-b border-[var(--hairline)] px-5 py-3 last:border-b-0"
          >
            <span
              aria-hidden
              className={`mt-1.5 inline-block h-2 w-2 flex-none rounded-full ${SEVERITY_DOT[severity]}`}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[13.5px] text-[color:var(--ink)]">
                {showTarget
                  ? describeAuditEvent(event)
                  : (AUDIT_META[event.action]?.label ?? event.action)}
              </span>
              <span className="text-[11.5px] text-[color:var(--ink-faint)]">
                by {event.actorEmail} ·{' '}
                <time dateTime={new Date(event.at).toISOString()}>{formatTimestamp(event.at)}</time>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
