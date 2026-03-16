"use client";
import type { ReactNode } from "react";
import clsx from "clsx";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

const toneStyles: Record<Tone, { background: string; color: string }> = {
  neutral: { background: "#F3F4F6", color: "#111111" },
  brand: { background: "#EAF3FF", color: "#247AED" },
  success: { background: "#E6F4EF", color: "#33A57D" },
  warning: { background: "#FEF3E9", color: "#F68523" },
  danger: { background: "#FDEBEA", color: "#EA3729" },
};

export default function Badge({
  children,
  tone = "neutral",
  className,
}: Props) {
  const style = toneStyles[tone];

  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center px-4 py-2 rounded-2xl font-satoshi text-[16px] font-normal leading-6",
        className
      )}
      style={{ background: style.background, color: style.color }}
    >
      {children}
    </span>
  );
}
