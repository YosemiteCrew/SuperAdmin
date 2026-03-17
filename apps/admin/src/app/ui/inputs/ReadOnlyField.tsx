"use client";

type Props = {
  label: string;
  value: string;
  className?: string;
};

/**
 * Read-only field with floating label — "filled" state from the design system.
 * Uses blue border and blue label to indicate a completed/read-only field.
 *
 * Variants in the design system:
 * - Input (default): gray border #BFBFBE, placeholder text
 * - Input (focused): blue border #247AED, blue floating label
 * - Input (filled):  blue border #247AED, blue floating label, value text
 * - Input (error):   red border #EA3729, red label, error message below
 *
 * This component renders the "filled" read-only variant.
 */
export default function ReadOnlyField({ label, value, className }: Props) {
  return (
    <div className={`relative flex-1 min-w-0 ${className ?? ""}`}>
      <div
        className="flex items-center h-12 px-6 rounded-2xl"
        style={{ border: "1px solid #247AED" }}
      >
        <span
          className="text-[16px] leading-6 tracking-[-0.02em] truncate"
          style={{
            fontFamily: "var(--font-satoshi)",
            fontWeight: 400,
            color: "#302F2E",
          }}
        >
          {value}
        </span>
      </div>
      <span
        className="absolute -top-2.5 left-6 px-1"
        style={{
          fontFamily: "var(--font-satoshi)",
          fontSize: "14px",
          lineHeight: "20px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
          color: "#247AED",
          background: "#FFFFFF",
        }}
      >
        {label}
      </span>
    </div>
  );
}
