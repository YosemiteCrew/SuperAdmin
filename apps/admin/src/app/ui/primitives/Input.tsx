"use client";
import { useState, useId } from "react";
import clsx from "clsx";

type Props = {
  label?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  id?: string;
};

export default function Input({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  disabled,
  className,
  name,
  id,
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;
  const hasValue = value !== undefined && value !== "";
  const isFloating = focused || hasValue;

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <div className="relative">
        {label && (
          <label
            htmlFor={inputId}
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
        <input
          id={inputId}
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={!label || isFloating ? placeholder : undefined}
          disabled={disabled}
          className="w-full outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            boxSizing: "border-box",
            height: "48px",
            padding: isPassword ? "10px 48px 10px 24px" : "10px 24px",
            border: `1px solid ${error ? "#EA3729" : focused ? "#247AED" : "#BFBFBE"}`,
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
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute top-1/2 -translate-y-1/2 transition-colors"
            style={{ right: "24px", color: "#302F2E" }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
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
