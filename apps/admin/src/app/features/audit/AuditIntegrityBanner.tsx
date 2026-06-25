import type { AuditChainStatus } from './types';

type Tone = 'ok' | 'partial' | 'broken';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'border-success-600/30 bg-success-100 text-success-700',
  partial: 'border-warning-600/30 bg-warning-100 text-warning-800',
  broken: 'border-danger-600/30 bg-danger-100 text-danger-600',
};

const TONE_DOT: Record<Tone, string> = {
  ok: 'bg-success-600',
  partial: 'bg-warning-600',
  broken: 'bg-danger-600',
};

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

  if (!status.ok) {
    const where = status.brokenAtId ? ` at entry ${status.brokenAtId}` : '';
    const why =
      status.reason === 'content-altered'
        ? 'an entry was modified after it was recorded'
        : 'an entry is missing or out of order';
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
