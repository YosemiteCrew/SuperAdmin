import { AUDIT_META, AUDIT_SEVERITY_LABELS, auditTargetLabel, type AuditSeverity } from './audit';
import { describeAuditTargetType } from './types';
import type { AuditEvent } from './types';

const SEVERITY_DOT: Record<AuditSeverity, string> = {
  info: 'bg-[var(--ink-faint2)]',
  warning: 'bg-[var(--warn)]',
  danger: 'bg-[var(--danger)]',
};

/**
 * A visible word beside the dot for the two severities worth noticing, so the
 * difference between a routine event and an erasure does not live in a colour.
 * `info` deliberately has no badge: a word on every row is a word on no row,
 * and the dot plus the screen-reader text already carry it.
 */
const SEVERITY_BADGE: Partial<Record<AuditSeverity, string>> = {
  warning: 'border-[color:var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]',
  danger:
    'border-[color:var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
};

const BADGE_SHELL =
  'inline-flex flex-none items-center rounded-full border px-[9px] py-[2.5px] text-[10px] font-bold uppercase tracking-[0.06em]';

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
    <section className="overflow-x-auto rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
      <table className="min-w-[680px] border-collapse text-[13px]">
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
                    {/* Read before the action so the severity arrives with the
                        row rather than after it. The dot stays decorative. */}
                    <span className="sr-only">{AUDIT_SEVERITY_LABELS[severity]}: </span>
                    {meta?.label ?? event.action}
                    {SEVERITY_BADGE[severity] ? (
                      <span aria-hidden className={`${BADGE_SHELL} ${SEVERITY_BADGE[severity]}`}>
                        {AUDIT_SEVERITY_LABELS[severity]}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-5 py-3 text-[color:var(--ink-muted)]">
                  <span>{auditTargetLabel(event)}</span>
                  <span className="ml-2 rounded-full bg-[var(--inset)] px-[9px] py-[2.5px] text-[10px] font-bold tracking-[0.06em] text-[color:var(--ink-faint)]">
                    {describeAuditTargetType(event.targetType)}
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
