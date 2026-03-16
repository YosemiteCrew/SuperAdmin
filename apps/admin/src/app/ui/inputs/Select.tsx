"use client";
import clsx from "clsx";

type Option = {
  value: string;
  label: string;
};

type Props = {
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  error?: string;
};

export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  name,
  error,
}: Props) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-caption-1 text-text-secondary font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={clsx(
            "w-full min-h-[48px] px-4 py-3 rounded-2xl border text-body-4 text-text-primary",
            "font-satoshi outline-none transition-colors duration-200 appearance-none",
            "disabled:opacity-60 disabled:cursor-not-allowed bg-neutral-0 pr-10",
            error
              ? "border-danger-600 focus:border-danger-600"
              : "border-card-border focus:border-brand-950"
          )}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {error && (
        <span className="text-caption-2 text-danger-600">{error}</span>
      )}
    </div>
  );
}
