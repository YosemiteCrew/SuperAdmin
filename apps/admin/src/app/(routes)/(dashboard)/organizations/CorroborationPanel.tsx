import {
  CORROBORATION_META,
  type CheckStatus,
  type CorroborationResult,
} from '@/app/features/organizations/corroboration';

const STATUS_META: Record<CheckStatus, { icon: string; className: string }> = {
  pass: {
    icon: '✓',
    className: 'bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  },
  warn: { icon: '!', className: 'bg-[var(--warn-bg)] text-[color:var(--warn-text)]' },
  fail: { icon: '✕', className: 'bg-[var(--danger-bg)] text-[color:var(--danger-text)]' },
  skipped: { icon: '–', className: 'bg-[var(--screen-2)] text-[color:var(--ink-faint)]' },
};

export function CorroborationFlag({ level }: Readonly<{ level: CorroborationResult['level'] }>) {
  const meta = CORROBORATION_META[level];
  return (
    <span
      title="Automatic pre-verification of the details this business entered"
      className={`inline-flex items-center gap-1.5 rounded-full px-[14px] py-[7px] text-xs font-bold ${meta.badgeClass}`}
    >
      {level === 'corroborated' ? '✓ ' : ''}
      {meta.label}
    </span>
  );
}

export function CorroborationPanel({ result }: Readonly<{ result: CorroborationResult }>) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
      <div className="flex items-center justify-between border-b border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[11px]">
        <h2 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
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
              className="flex items-start gap-3 border-b border-[var(--hairline)] px-[18px] py-3 last:border-b-0"
            >
              <span
                aria-hidden
                className={`mt-px inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-xs font-semibold ${meta.className}`}
              >
                {meta.icon}
              </span>
              <div className="flex flex-col gap-px">
                <span className="text-[13.5px] font-semibold text-[color:var(--ink)]">
                  {check.label}
                </span>
                <span className="text-xs text-[color:var(--ink-faint)]">{check.detail}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-3 text-[11.5px] leading-[1.55] text-[color:var(--ink-faint)]">
        Automated signals only — confirm authoritative details (tax ID, licences) before verifying.
      </p>
    </section>
  );
}
