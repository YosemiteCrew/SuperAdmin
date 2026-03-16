"use client";

import { useState, useRef, useEffect } from "react";

type Option = { value: string; label: string };

type Props = {
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Select…",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filteredOptions = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (opt: Option) => {
    onChange?.(opt.value);
    setOpen(false);
    setSearch("");
  };

  const displayLabel = label ?? placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button (closed state) */}
      <button
        type="button"
        onClick={() => setOpen((prev) => { if (prev) setSearch(""); return !prev; })}
        className="relative w-full flex items-center justify-between gap-2 min-w-[120px] cursor-pointer outline-none"
        style={{
          height: "48px",
          padding: "11px 24px",
          border: `1px solid ${open ? "#247AED" : "#EAEAEA"}`,
          borderRadius: "16px",
          background: "#FFFFFF",
        }}
      >
        {/* Floating label when value selected */}
        {selected && !open && (
          <span
            className="absolute pointer-events-none"
            style={{
              top: "-10px",
              left: "20px",
              padding: "0 4px",
              fontSize: "14px",
              lineHeight: "20px",
              letterSpacing: "-0.02em",
              color: "#595958",
              background: "#FFFFFF",
              fontFamily: "var(--font-satoshi)",
              fontWeight: 400,
            }}
          >
            {displayLabel}
          </span>
        )}

        <span
          className="truncate"
          style={{
            fontFamily: "var(--font-satoshi)",
            fontSize: "16px",
            fontWeight: 400,
            color: selected ? "#302F2E" : "#595958",
            maxWidth: "200px",
          }}
        >
          {selected ? selected.label : displayLabel}
        </span>

        {/* Filled down arrow matching the HTML reference */}
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 320 512"
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "#302F2E" }}
          height="20"
          width="20"
        >
          <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z" />
        </svg>
      </button>

      {/* Dropdown overlay — absolute, above content */}
      {open && (
        <div
          className="absolute left-0 right-0 z-50"
          style={{
            top: 0,
            background: "#FFFFFF",
            border: "1px solid #247AED",
            borderRadius: "16px",
            boxShadow: "none",
          }}
        >
          {/* Search input at top */}
          <div
            className="flex items-center justify-between gap-2"
            style={{ height: "48px", padding: "0 24px" }}
          >
            {/* Floating label */}
            <span
              className="absolute pointer-events-none"
              style={{
                top: "-10px",
                left: "20px",
                padding: "0 4px",
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "-0.02em",
                color: "#247AED",
                background: "#FFFFFF",
                fontFamily: "var(--font-satoshi)",
                fontWeight: 400,
              }}
            >
              {displayLabel}
            </span>

            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={selected?.label ?? placeholder}
              className="outline-none w-full bg-transparent"
              style={{
                fontFamily: "var(--font-satoshi)",
                fontSize: "16px",
                fontWeight: 400,
                lineHeight: "24px",
                letterSpacing: "-0.02em",
                color: "#302F2E",
              }}
            />

            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 320 512"
              className="shrink-0 rotate-180 cursor-pointer"
              style={{ color: "#302F2E" }}
              height="20"
              width="20"
              onClick={() => { setOpen(false); setSearch(""); }}
            >
              <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z" />
            </svg>
          </div>

          {/* Divider — blue to match outer border */}
          <div style={{ borderTop: "1px solid #247AED", margin: "0" }} />

          {/* Options list */}
          <div style={{ maxHeight: "240px", overflowY: "auto", padding: "8px 12px" }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "12px 16px",
                  fontSize: "16px",
                  color: "#A09F9F",
                  fontFamily: "var(--font-satoshi)",
                }}
              >
                No results
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className="w-full text-left transition-colors"
                  style={{
                    padding: "12px 16px",
                    fontSize: "16px",
                    lineHeight: "24px",
                    letterSpacing: "-0.02em",
                    borderRadius: "12px",
                    fontFamily: "var(--font-satoshi)",
                    fontWeight: 400,
                    color: "#595958",
                    background: "transparent",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F7F7F7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
