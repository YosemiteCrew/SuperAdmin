"use client";

import { useRef, useCallback } from "react";

type OtpInputProps = {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
};

export function OtpInput({
  length = 4,
  value,
  onChange,
  className = "",
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (index: number, digit: string) => {
      const newValue = [...value];
      newValue[index] = digit.replace(/\D/g, "").slice(-1);
      onChange(newValue);
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [value, onChange, length]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [value]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      const newValue = pasted.split("");
      const padded = Array.from({ length }, (_, i) => newValue[i] || "");
      onChange(padded);
      const focusIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    },
    [onChange, length]
  );

  return (
    <div className={`flex justify-center gap-4 ${className}`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-16 w-14 flex-shrink-0 rounded-2xl border border-gray-200 bg-white text-center text-lg font-medium text-[#302F2E] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
        />
      ))}
    </div>
  );
}
