import Link from 'next/link';

import { detectDataRequestSignal } from '@/app/features/contact/dataRequestSignal';
import { REQUEST_TYPE_LABELS } from '@/app/features/dataRequests/types';

/**
 * The marker a contact card shows when its wording reads like a request about
 * the sender's own personal data, whatever the form's dropdown said.
 *
 * It is a reading, not a decision: the matched phrases are printed so the
 * operator can judge the marker itself, and the only action offered is the
 * existing manual form with the email and type filled in. Nothing is written
 * here, no clock starts here, and the contact row is untouched either way.
 */
export function DataRequestFlag({
  email,
  subject,
  message,
}: Readonly<{ email: string; subject: string | null; message: string }>) {
  const signals = detectDataRequestSignal({ subject, message });
  if (signals.length === 0) return null;

  const kinds = signals.map((s) => REQUEST_TYPE_LABELS[s.type]).join(', ');
  const phrases = signals.flatMap((s) => s.phrases).map((p) => `"${p}"`);
  const href = `/privacy/requests?subjectEmail=${encodeURIComponent(email)}&type=${signals[0].type}`;

  return (
    <div className="flex flex-col gap-[6px] rounded-[12px] border border-[color:var(--warn-border)] bg-[var(--warn-bg)] px-[12px] py-[10px]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[color:var(--warn-text)]">
        Reads like a data request · {kinds}
      </p>
      <p className="text-[12px] leading-[1.5] text-[color:var(--ink-muted)]">
        Matched {phrases.join(', ')}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href={href}
          className="text-[12px] font-semibold text-[color:var(--blue-text)] hover:underline"
        >
          Log it on the data-request form <span className="sr-only">for {email}</span> -&gt;
        </Link>
        <span className="text-[11.5px] text-[color:var(--ink-faint)]">
          Opens the form filled in. Nothing is logged until you submit it.
        </span>
      </div>
    </div>
  );
}
