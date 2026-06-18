import type { SessionInformation } from 'supertokens-node/recipe/session/types';

import { revokeAllSessionsAction, revokeSessionAction } from './actions';

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
}: Readonly<{ sessions: SessionInformation[]; userId: string }>) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <div className="flex items-center justify-between border-b border-line bg-raised px-5 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-2">
          Active sessions ({sessions.length})
        </h2>
        {sessions.length > 0 ? (
          <form action={revokeAllSessionsAction}>
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              className="rounded-lg border border-danger-600 px-3 py-1 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white"
            >
              Revoke all
            </button>
          </form>
        ) : null}
      </div>
      {sessions.length === 0 ? (
        <div className="p-5 text-sm text-ink-3">No active sessions.</div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-2">
              <th className="px-5 py-3">Session handle</th>
              <th className="px-5 py-3">Tenant</th>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3">Expires in</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.sessionHandle} className="border-b border-line last:border-b-0">
                <td
                  className="px-5 py-3 font-mono text-xs text-ink-2"
                  title={session.sessionHandle}
                >
                  {session.sessionHandle.slice(0, 16)}…
                </td>
                <td className="px-5 py-3 text-ink-2">{session.tenantId}</td>
                <td className="px-5 py-3 text-ink-2">{formatDateTime(session.timeCreated)}</td>
                <td className="px-5 py-3 text-ink-2">{timeUntil(session.expiry)}</td>
                <td className="px-5 py-3 text-right">
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="sessionHandle" value={session.sessionHandle} />
                    <input type="hidden" name="userId" value={userId} />
                    <button
                      type="submit"
                      className="rounded-lg border border-line px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-raised"
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
