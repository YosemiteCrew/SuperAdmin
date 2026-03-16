"use client";
import type { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  fullWidth?: boolean;
};

export default function Secondary({
  children,
  onClick,
  disabled,
  type = "button",
  className,
  fullWidth,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "px-8 py-3 rounded-2xl bg-transparent border border-card-border text-text-primary text-body-4-emphasis",
        "transition-all duration-300 ease-in-out hover:border-brand-950 hover:text-brand-950",
        "disabled:pointer-events-none disabled:opacity-60",
        fullWidth && "w-full",
        className
      )}
    >
      {children}
    </button>
  );
}
