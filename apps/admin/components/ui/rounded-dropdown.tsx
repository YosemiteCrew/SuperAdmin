"use client";

import { useRef, useEffect, useState } from "react";

type RoundedDropdownProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  optionClassName?: string;
};

export function RoundedDropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className = "",
  optionClassName = "",
}: RoundedDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder ?? "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex min-w-[100px] items-center justify-between gap-2 rounded-2xl border-0 outline-none focus:outline-none focus:ring-0 disabled:opacity-50 ${className}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{displayLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`cursor-pointer px-4 py-2 text-sm transition-colors hover:bg-blue-50 ${
                opt.value === value ? "bg-blue-50 text-[#302F2E]" : "text-[#302F2E]"
              } ${optionClassName}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
