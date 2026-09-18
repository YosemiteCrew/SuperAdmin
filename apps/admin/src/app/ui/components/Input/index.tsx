import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Same field styling the other dashboard forms use inline (privacy/requests
// RequestsTable), so the settings inputs read as the same control. Without it
// the element falls back to the UA default: no border, no background and a
// fixed ~155px width that ignores its container.
const FIELD =
  'h-[38px] w-full rounded-[11px] border-[1.5px] border-[color:var(--hairline)] bg-[var(--field-bg)] px-3 text-[13px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--blue)]';
const FIELD_LABEL = 'text-[11px] font-semibold text-[color:var(--ink-soft)]';

export function Input({ label, error, id, className, ...props }: Readonly<InputProps>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      <input id={id} className={className ? `${FIELD} ${className}` : FIELD} {...props} />
      {error && (
        <span role="alert" className="text-[12px] text-[color:var(--danger-text)]">
          {error}
        </span>
      )}
    </div>
  );
}
