import { AUDIT_META, AUDIT_SEVERITY_LABELS, describeAuditEvent, type AuditSeverity } from './audit';
import type { AuditEvent } from './types';

// The dot is decoration. Severity is carried by the screen-reader word below
// it and, for warning and danger, by a visible badge beside the action.
const SEVERITY_DOT: Record<AuditSeverity, string> = {
  info: 'bg-[var(--ink-faint)]',
  warning: 'bg-[var(--warn)]',
  danger: 'bg-[var(--danger)]',
};

/** See AuditTable: only the two severities worth noticing carry a visible word. */
const SEVERITY_BADGE: Partial<Record<AuditSeverity, string>> = {
  warning: 'border-[color:var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]',
  danger:
    'border-[color:var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
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
                <span className="sr-only">{AUDIT_SEVERITY_LABELS[severity]}: </span>
                {showTarget
                  ? describeAuditEvent(event)
                  : (AUDIT_META[event.action]?.label ?? event.action)}
                {SEVERITY_BADGE[severity] ? (
                  <span
                    aria-hidden
                    className={`ml-2 inline-flex items-center rounded-full border px-[7px] py-[1.5px] text-[9.5px] font-bold uppercase tracking-[0.06em] ${SEVERITY_BADGE[severity]}`}
                  >
                    {AUDIT_SEVERITY_LABELS[severity]}
                  </span>
                ) : null}
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
