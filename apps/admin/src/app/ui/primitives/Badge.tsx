"use client";
import type { ReactNode } from "react";
import clsx from "clsx";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

const toneClasses: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-900",
  brand: "bg-brand-100 text-neutral-900",
  success: "bg-success-100 text-success-900",
  warning: "bg-warning-100 text-warning-900",
  danger: "bg-danger-100 text-danger-900",
};

export default function Badge({
  children,
  tone = "neutral",
  className,
}: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-3 py-1 rounded-lg text-caption-1 font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
