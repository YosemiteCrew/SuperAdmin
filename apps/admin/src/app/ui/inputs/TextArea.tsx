"use client";
import { useState, useId } from "react";
import clsx from "clsx";

type Props = {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  id?: string;
  rows?: number;
};

/**
 * TextArea with floating label — follows the input design system.
 *
 * States:
 * - Default: gray border #595958, placeholder
 * - Focused: blue border #247AED, blue floating label
 * - Filled:  blue border #247AED, blue floating label, value
 * - Error:   red border #EA3729, red label, error message below
 */
export default function TextArea({
  label,
  value,
  onChange,
  error,
  placeholder,
  disabled,
  className,
  name,
  id,
  rows = 3,
}: Props) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== "";
  const isFloating = focused || hasValue;

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <div className="relative">
        {label && (
          <label
            htmlFor={textareaId}
            className="absolute pointer-events-none transition-all duration-200"
            style={{
              left: "24px",
              top: isFloating ? "-8px" : "12px",
              fontSize: isFloating ? "14px" : "16px",
              lineHeight: isFloating ? "20px" : "24px",
              color: error ? "#EA3729" : focused ? "#247AED" : "#595958",
              background: isFloating ? "#FFFFFF" : "transparent",
              padding: isFloating ? "0 4px" : "0",
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-satoshi)",
              fontWeight: 400,
              zIndex: 1,
            }}
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={!label || isFloating ? placeholder : undefined}
          disabled={disabled}
          rows={rows}
          className="w-full outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            boxSizing: "border-box",
            padding: "10px 14px",
            border: `1px solid ${error ? "#EA3729" : focused ? "#247AED" : "#595958"}`,
            borderRadius: "12px",
            fontFamily: "var(--font-satoshi)",
            fontSize: "16px",
            fontWeight: 400,
            lineHeight: "24px",
            letterSpacing: "-0.02em",
            color: "#302F2E",
            background: "#FFFFFF",
          }}
        />
      </div>
      {error && (
        <div className="flex items-center gap-1" style={{ padding: "0 24px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 22h20L12 2zm0 7v6m0 2v2"
              stroke="#EA3729"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-satoshi)",
              fontSize: "12px",
              lineHeight: "16px",
              letterSpacing: "-0.02em",
              color: "#EA3729",
              fontWeight: 400,
            }}
          >
            {error}
          </span>
        </div>
      )}
    </div>
  );
}
