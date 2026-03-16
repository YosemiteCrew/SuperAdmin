"use client";
import { useState, useEffect, useRef, useCallback } from "react";

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
  debounceMs = 200,
}: Props) {
  const [localValue, setLocalValue] = useState(controlledValue ?? "");
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isControlled = controlledValue !== undefined;

  // Sync from parent only when controlled value changes externally
  useEffect(() => {
    if (isControlled && controlledValue !== localValue) {
      setLocalValue(controlledValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledValue]);

  const debouncedOnChange = useCallback(
    (val: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange?.(val);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val); // instant update for typing feel
    debouncedOnChange(val); // debounced callback to parent
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full outline-none"
        style={{
          boxSizing: "border-box",
          height: "48px",
          padding: "10px 48px 10px 24px",
          border: `1px solid ${focused ? "#247AED" : "#BFBFBE"}`,
          borderRadius: "16px",
          fontFamily: "var(--font-satoshi)",
          fontSize: "16px",
          fontWeight: 400,
          lineHeight: "24px",
          letterSpacing: "-0.02em",
          color: "#302F2E",
          background: "#FFFFFF",
        }}
      />
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
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
  );
}
