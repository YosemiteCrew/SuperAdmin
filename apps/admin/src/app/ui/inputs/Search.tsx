"use client";
import { useState, useEffect, useRef } from "react";
import clsx from "clsx";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
};

export default function Search({
  value: controlledValue,
  onChange,
  placeholder = "Search...",
  className,
  debounceMs = 300,
}: Props) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = controlledValue ?? internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalValue(val);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange?.(val);
    }, debounceMs);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={clsx("relative", className)}>
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={clsx(
          "w-full min-h-[48px] pl-11 pr-4 py-3 rounded-2xl border border-card-border",
          "text-body-4 text-text-primary placeholder:text-text-tertiary",
          "font-satoshi outline-none transition-colors duration-200",
          "focus:border-brand-950"
        )}
      />
    </div>
  );
}
