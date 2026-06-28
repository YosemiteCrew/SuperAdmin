import {
  CORROBORATION_META,
  type CheckStatus,
  type CorroborationResult,
} from '@/app/features/organizations/corroboration';

const STATUS_META: Record<CheckStatus, { icon: string; className: string }> = {
  pass: { icon: '✓', className: 'text-success-700' },
  warn: { icon: '!', className: 'text-warning-800' },
  fail: { icon: '✕', className: 'text-danger-600' },
  skipped: { icon: '–', className: 'text-ink-3' },
};

export function CorroborationFlag({ level }: Readonly<{ level: CorroborationResult['level'] }>) {
  const meta = CORROBORATION_META[level];
  return (
    <span
      title="Automatic pre-verification of the details this business entered"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badgeClass}`}
    >
      {level === 'corroborated' ? '✓ ' : ''}
      {meta.label}
    </span>
  );
}

export function CorroborationPanel({ result }: Readonly<{ result: CorroborationResult }>) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <div className="flex items-center justify-between border-b border-line bg-raised px-5 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-2">
          Pre-verification checks
        </h2>
        <CorroborationFlag level={result.level} />
      </div>
      <ul className="flex flex-col">
        {result.checks.map((check) => {
          const meta = STATUS_META[check.status];
          return (
            <li
              key={check.id}
              className="flex items-start gap-3 border-b border-line px-5 py-3 last:border-b-0"
            >
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-raised text-xs font-semibold ${meta.className}`}
              >
                {meta.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-ink">{check.label}</span>
                <span className="text-xs text-ink-3">{check.detail}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="px-5 py-3 text-xs text-ink-3">
        Automated signals only — confirm authoritative details (tax ID, licences) before verifying.
      </p>
    </section>
  );
}
