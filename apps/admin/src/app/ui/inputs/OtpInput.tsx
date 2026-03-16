"use client";
import { useRef, useCallback } from "react";
import clsx from "clsx";

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  className?: string;
};

export default function OtpInput({
  length = 6,
  value,
  onChange,
  error,
  className,
}: Props) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    inputsRef.current[index]?.focus();
  }, []);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;

    const chars = value.split("");
    chars[index] = char;
    const newValue = chars.join("").slice(0, length);
    onChange(newValue.padEnd(length, "").trimEnd());

    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = value.split("");
      if (chars[index]) {
        chars[index] = "";
        onChange(chars.join("").trimEnd());
      } else if (index > 0) {
        chars[index - 1] = "";
        onChange(chars.join("").trimEnd());
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    focusInput(focusIdx);
  };

  return (
    <div className={clsx("flex gap-3", className)}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={clsx(
            "w-14 h-16 rounded-xl border text-center text-heading-2 text-text-primary",
            "font-satoshi outline-none transition-colors duration-200",
            error
              ? "border-danger-600 focus:border-danger-600"
              : "border-card-border focus:border-brand-950"
          )}
        />
      ))}
    </div>
  );
}
