import { AUDIT_META, describeAuditEvent, type AuditSeverity } from './audit';
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

export function AuditTimeline({
  events,
  emptyMessage = 'No recorded activity yet.',
  showTarget = false,
}: Readonly<{ events: AuditEvent[]; emptyMessage?: string; showTarget?: boolean }>) {
  if (events.length === 0) {
    return <div className="p-5 text-sm text-ink-3">{emptyMessage}</div>;
  }

  return (
    <ul className="flex flex-col">
      {events.map((event) => {
        const severity = AUDIT_META[event.action]?.severity ?? 'info';
        return (
          <li
            key={event.id}
            className="flex items-start gap-3 border-b border-line px-5 py-3 last:border-b-0"
          >
            <span
              aria-hidden
              className={`mt-1.5 inline-block h-2 w-2 flex-none rounded-full ${SEVERITY_DOT[severity]}`}
            />
            <div className="flex flex-col">
              <span className="text-sm text-ink">
                {showTarget
                  ? describeAuditEvent(event)
                  : (AUDIT_META[event.action]?.label ?? event.action)}
              </span>
              <span className="text-xs text-ink-3">
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
