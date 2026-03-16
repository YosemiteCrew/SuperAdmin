"use client";
import { useId, useState } from "react";
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
  id?: string;
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
  id,
}: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const [focused, setFocused] = useState(false);

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontFamily: "var(--font-satoshi)",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "-0.02em",
            color: error ? "#EA3729" : focused ? "#247AED" : "#595958",
            fontWeight: 400,
            marginBottom: "4px",
          }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="w-full outline-none appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            boxSizing: "border-box",
            height: "48px",
            padding: "12px 48px 12px 24px",
            border: `1px solid ${error ? "#EA3729" : focused ? "#247AED" : "#BFBFBE"}`,
            borderRadius: "16px",
            fontFamily: "var(--font-satoshi)",
            fontSize: "16px",
            fontWeight: 400,
            lineHeight: "24px",
            letterSpacing: "-0.02em",
            color: value ? "#302F2E" : "#595958",
            background: "#FFFFFF",
          }}
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
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ right: "24px", color: "#302F2E" }}
          width="20"
          height="20"
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
        <div className="flex items-center gap-1" style={{ padding: "0 24px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 22h20L12 2zm0 7v6m0 2v2" stroke="#EA3729" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "var(--font-satoshi)", fontSize: "12px", lineHeight: "16px", letterSpacing: "-0.02em", color: "#EA3729", fontWeight: 400 }}>
            {error}
          </span>
        </div>
      )}
    </div>
  );
}
