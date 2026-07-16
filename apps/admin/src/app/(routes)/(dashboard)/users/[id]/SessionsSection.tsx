import type { SessionInformation } from 'supertokens-node/recipe/session/types';

import { revokeAllSessionsAction, revokeSessionAction } from './actions';

const SESSION_TH =
  'px-[18px] py-[9px] text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint2)]';
const SESSION_TD = 'px-[18px] py-3 text-[13px] text-[color:var(--ink-muted)]';

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeUntil(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    return `${Math.floor(diff / (1000 * 60))} min`;
  }
  if (hours < 48) return `${hours} hr`;
  return `${Math.floor(hours / 24)} days`;
}

export function SessionsSection({
  sessions,
  userId,
  showRevokeAll = true,
}: Readonly<{ sessions: SessionInformation[]; userId: string; showRevokeAll?: boolean }>) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
      <div className="flex items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[11px]">
        <h2 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
          Active sessions ({sessions.length})
        </h2>
        {sessions.length > 0 && showRevokeAll ? (
          <form action={revokeAllSessionsAction}>
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              className="rounded-full border border-[color:var(--danger-border)] px-3 py-1 text-[11.5px] font-semibold text-[color:var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)]"
            >
              Revoke all
            </button>
          </form>
        ) : null}
      </div>
      {sessions.length === 0 ? (
        <div className="p-[18px] text-[13px] text-[color:var(--ink-muted)]">
          No active sessions.
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[color:var(--hairline)] bg-[var(--screen-2)] text-left">
              <th className={SESSION_TH}>Session handle</th>
              <th className={SESSION_TH}>Tenant</th>
              <th className={SESSION_TH}>Created</th>
              <th className={SESSION_TH}>Expires in</th>
              <th className={`${SESSION_TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.sessionHandle}
                className="border-b border-[color:var(--hairline)] last:border-b-0"
              >
                <td
                  className="px-[18px] py-3 font-mono text-[11.5px] text-[color:var(--ink-muted)]"
                  title={session.sessionHandle}
                >
                  {session.sessionHandle.slice(0, 16)}…
                </td>
                <td className={SESSION_TD}>{session.tenantId}</td>
                <td className={SESSION_TD}>{formatDateTime(session.timeCreated)}</td>
                <td className={SESSION_TD}>{timeUntil(session.expiry)}</td>
                <td className="px-[18px] py-3 text-right">
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="sessionHandle" value={session.sessionHandle} />
                    <input type="hidden" name="userId" value={userId} />
                    <button
                      type="submit"
                      className="rounded-full border border-[color:var(--divider)] px-3 py-1 text-[12px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
                    >
                      Revoke
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
