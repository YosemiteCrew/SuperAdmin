import type { AuditChainStatus } from './types';

type Tone = 'ok' | 'partial' | 'broken';

// An intact chain is a good status, so it takes the green badge palette; the
// dot keeps bare --success, matching the live dots elsewhere.
const TONE_CLASS: Record<Tone, string> = {
  ok: 'border-[var(--success)]/40 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  partial: 'border-[var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]',
  broken: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
};

const TONE_DOT: Record<Tone, string> = {
  ok: 'bg-[var(--success)]',
  partial: 'bg-[var(--warn)]',
  broken: 'bg-[var(--danger)]',
};

/** Why the hash walk failed, phrased to complete "The hash chain broke...: ". */
const BROKEN_REASON: Partial<Record<NonNullable<AuditChainStatus['reason']>, string>> = {
  'content-altered': 'an entry was modified after it was recorded',
  'head-unchained': 'the newest entry carries no chain link while older entries do',
};

/** Wording for `link-broken`, and the fallback for an unrecognised reason. */
const LINK_BROKEN_DETAIL = 'an entry is missing or out of order';

function Banner({ tone, title, detail }: Readonly<{ tone: Tone; title: string; detail: string }>) {
  return (
    <div
      // A failed check is an alert (announced); an intact log is a passive status.
      role={tone === 'broken' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${TONE_CLASS[tone]}`}
    >
      <span
        aria-hidden
        className={`mt-1.5 inline-block h-2 w-2 flex-none rounded-full ${TONE_DOT[tone]}`}
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="opacity-90">{detail}</span>
      </span>
    </div>
  );
}

/**
 * Surfaces the result of {@link verifyAuditChain}: a passive "verified" status
 * when the hash chain is intact, and a prominent alert when it broke. Renders
 * nothing when there is nothing to verify (empty log).
 */
export function AuditIntegrityBanner({ status }: Readonly<{ status: AuditChainStatus }>) {
  if (status.reason === 'read-failed') {
    return (
      <Banner
        tone="partial"
        title="Integrity check unavailable"
        detail="The audit log could not be read to verify its hash chain."
      />
    );
  }

  if (status.total === 0) return null;

  // A record the validator rejects never reaches the hash walk, so it needs its
  // own wording rather than the "chain broke" template below.
  if (status.reason === 'invalid-record') {
    const where = status.brokenAtId ? ` (entry ${status.brokenAtId})` : '';
    return (
      <Banner
        tone="broken"
        title="Audit log integrity check failed"
        detail={`A stored entry${where} is not a well-formed audit record, so the log could not be verified. The log may have been tampered with.`}
      />
    );
  }

  if (!status.ok) {
    const where = status.brokenAtId ? ` at entry ${status.brokenAtId}` : '';
    const why = (status.reason && BROKEN_REASON[status.reason]) ?? LINK_BROKEN_DETAIL;
    return (
      <Banner
        tone="broken"
        title="Audit log integrity check failed"
        detail={`The hash chain broke${where}: ${why}. The log may have been tampered with.`}
      />
    );
  }

  if (status.length < status.total) {
    const unverified = status.total - status.length;
    return (
      <Banner
        tone="partial"
        title="Audit log integrity verified"
        detail={`${status.length} of ${status.total} entries verified; ${unverified} older ${
          unverified === 1 ? 'entry predates' : 'entries predate'
        } tamper-evidence.`}
      />
    );
  }

  return (
    <Banner
      tone="ok"
      title="Audit log integrity verified"
      detail={`All ${status.total} ${
        status.total === 1 ? 'entry forms' : 'entries form'
      } an intact hash chain.`}
    />
  );
}
